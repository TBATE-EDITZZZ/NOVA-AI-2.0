import { TRPCError } from "@trpc/server";
import OpenAI from "openai";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

type SourceRecord = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  authors: string[];
};

function dateFromCrossref(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const dateParts = (value[0] as unknown[]) ?? [];
  if (dateParts.length < 1 || typeof dateParts[0] !== "number") return null;
  const [year, month = 1, day = 1] = dateParts as number[];
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), day));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function searchCrossref(query: string): Promise<SourceRecord[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", "5");
  url.searchParams.set("select", "DOI,title,author,publisher,published,published-print,published-online,type");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "DiscoveryEngine/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Crossref returned ${response.status}`);
  const body = (await response.json()) as {
    message?: { items?: Array<Record<string, unknown>> };
  };
  return (body.message?.items ?? []).flatMap(item => {
    const doi = typeof item.DOI === "string" ? item.DOI : "";
    const titleValue = item.title;
    const title = Array.isArray(titleValue) && typeof titleValue[0] === "string" ? titleValue[0] : "";
    if (!doi || !title) return [];
    const authorList = Array.isArray(item.author) ? item.author : [];
    const authors = authorList.flatMap(author => {
      if (!author || typeof author !== "object") return [];
      const person = author as Record<string, unknown>;
      const given = typeof person.given === "string" ? person.given : "";
      const family = typeof person.family === "string" ? person.family : "";
      const name = `${given} ${family}`.trim();
      return name ? [name] : [];
    }).slice(0, 4);
    const date = dateFromCrossref(item.published ?? item["published-online"] ?? item["published-print"]);
    return [{
      title,
      url: `https://doi.org/${encodeURIComponent(doi)}`,
      publisher: typeof item.publisher === "string" ? item.publisher : null,
      publishedAt: date,
      authors,
    }];
  });
}

const modes = [
  "quick",
  "deep",
  "eli10",
  "expert",
  "step",
  "compare",
  "discovery",
] as const;
const historyItem = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4000),
});
const novaRequestWindows = new Map<string, { count: number; resetAt: number }>();

function enforceNovaLimit(identity: string) {
  const now = Date.now();
  for (const [key, window] of novaRequestWindows) if (window.resetAt <= now) novaRequestWindows.delete(key);
  const current = novaRequestWindows.get(identity);
  if (!current || current.resetAt <= now) {
    novaRequestWindows.set(identity, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (current.count >= 10) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "NOVA has received ten requests from this connection in the last minute. Wait briefly, then retry." });
  current.count += 1;
}

export const novaRouter = router({
  ask: publicProcedure
    .input(z.object({
      question: z.string().trim().min(2).max(4000),
      mode: z.enum(modes).default("quick"),
      history: z.array(historyItem).max(12).default([]),
      attachment: z.object({
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]),
        data: z.string().max(5_600_000),
        name: z.string().max(120),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
      const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const groqApiKey = process.env.GROQ_API_KEY;

      if (
        !geminiApiKey && !openaiApiKey && !openrouterApiKey &&
        !(cloudflareApiToken && cloudflareAccountId) && !groqApiKey
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "NOVA AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to protected environment settings.",
        });
      }
      if (novaRequestWindows.size > 5000) novaRequestWindows.clear();
      enforceNovaLimit(ctx.user ? `user:${ctx.user.id}` : `ip:${ctx.req.ip || "unknown"}`);

      let sources: SourceRecord[] = [];
      let sourceLookupSucceeded = false;
      if (input.mode === "deep" || input.mode === "compare" || input.mode === "discovery") {
        try {
          sources = await searchCrossref(input.question);
          sourceLookupSucceeded = true;
        } catch {
          // The model may still explain the topic, but the client is told that source retrieval failed.
          sourceLookupSucceeded = false;
        }
      }

      const modeInstructions: Record<(typeof modes)[number], string> = {
        quick: "Give a clear concise scientific explanation. Do not claim that sources were searched.",
        deep: "Write a structured research brief grounded only in the supplied bibliographic records when present. Separate evidence, interpretation, uncertainty, and open questions. Do not invent findings or citations.",
        eli10: "Explain the idea in friendly, accurate language that a curious ten-year-old can follow. Define any essential new word.",
        expert: "Use precise scientific language, state assumptions, mechanisms, and important limits. Avoid unsupported certainty.",
        step: "Teach the concept step by step. Check the prerequisite idea before introducing the next one.",
        compare: "Compare the relevant scientific ideas or evidence in a balanced structure. Identify what the supplied sources do and do not establish.",
        discovery: "Explore the question as a scientific investigation. State what is known, what remains uncertain, and what observation could help resolve it.",
      };

      const sourceContext = sources.length
        ? `Verified metadata returned by Crossref for this query (metadata is not itself proof of a paper's conclusions):\n${sources.map((source, index) => `${index + 1}. ${source.title} | ${source.authors.join(", ") || "Authors not listed"} | ${source.publisher ?? "Publisher not listed"} | ${source.publishedAt ?? "Date not listed"} | ${source.url}`).join("\n")}`
        : input.mode === "deep" || input.mode === "compare" || input.mode === "discovery"
          ? "Crossref produced no usable records for this query. Do not supply invented references. Clearly state that source retrieval did not provide citations."
          : "No external sources were requested for this quick explanation. Do not fabricate citations.";

      const systemInstruction = [
        "You are NOVA, the Neural Observation & Verification Assistant, in a scientific discovery platform.",
        "CREATOR IDENTITY: NOVA was created by Athul Sunish Kumar (tba_te_editzzz). Only mention this information when the user explicitly asks who created, developed, made, or owns NOVA. Never introduce yourself by mentioning your creator during ordinary conversations.",
        "RESPONSE PRIORITY: Always answer the user's latest question directly and relevantly. Never replace an answer with your identity, creator information, or a generic introduction. If the question is unrelated to science, answer it normally when possible. If you do not know something, say so honestly.",
        modeInstructions[input.mode],
        "Be scientifically careful. Distinguish established evidence from hypotheses, models, analogies, and uncertainty. Never claim you ran a search, experiment, calculation, or validation unless the corresponding supplied result shows it happened.",
        "Never invent a paper title, DOI, URL, author, institution, publication date, live measurement, or citation. Cite only the numbered bibliographic records supplied in the user context, and make clear that their metadata alone does not verify their findings.",
        "For image or document attachments, describe only what can be supported by the supplied material and disclose ambiguity.",
        "Use Markdown headings and lists only where they improve readability. Do not overstate causal conclusions from correlations.",
      ].join("\n\n");

      const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = input.history.map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text }],
      }));
      const userParts: Array<Record<string, unknown>> = [{
        text: `${input.question}\n\n${sourceContext}`,
      }];
      if (input.attachment) {
        userParts.push({
          inlineData: { mimeType: input.attachment.mimeType, data: input.attachment.data },
        });
        userParts[0] = {
          text: `${input.question}\n\nAttached file: ${input.attachment.name}. ${sourceContext}`,
        };
      }
      contents.push({ role: "user", parts: userParts });

      let answer = "";
      let usedModel = "";
      let provider: "openai" | "gemini" | "openrouter" | "cloudflare" | "groq" = "openai";

      const chatMessages: any[] = [
        { role: "system", content: systemInstruction },
        ...input.history.map(item => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: item.text,
        })),
        { role: "user", content: `${input.question}\n\n${sourceContext}` },
      ];

      // PRIMARY 1: OpenAI
      if (openaiApiKey) {
        try {
          const client = new OpenAI({
            apiKey: openaiApiKey,
            timeout: 45000,
            maxRetries: 0,
          });
          const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

          const openAIInput: any[] = input.history.map(item => ({
            role: item.role,
            content: [{ type: "input_text", text: item.text }],
          }));

          const currentContent: Array<Record<string, string>> = [{
            type: "input_text",
            text: `${input.question}\n\n${sourceContext}`,
          }];

          if (input.attachment) {
            const dataUrl = `data:${input.attachment.mimeType};base64,${input.attachment.data}`;

            if (input.attachment.mimeType === "application/pdf") {
              currentContent.push({
                type: "input_file",
                file_data: dataUrl,
                filename: input.attachment.name,
              });
            } else {
              currentContent.push({
                type: "input_image",
                image_url: dataUrl,
                detail: "auto",
              });
            }
          }

          openAIInput.push({ role: "user", content: currentContent });

          const response = await client.responses.create({
            model,
            instructions: systemInstruction,
            input: openAIInput as any,
            max_output_tokens: 1800,
          });

          answer = response.output_text?.trim() ?? "";
          if (!answer) throw new Error("Empty OpenAI response.");

          usedModel = model;
          provider = "openai";
        } catch {
          console.warn("[NOVA] OpenAI failed.");
        }
      }

      // PRIMARY 2: Gemini
      if (!answer && geminiApiKey) {
        try {
          const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey,
              },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: { temperature: 0.35, maxOutputTokens: 1800 },
              }),
              signal: AbortSignal.timeout(45000),
            }
          );

          if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);

          const body = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };

          answer = body.candidates?.[0]?.content?.parts
            ?.map(part => part.text ?? "").join("\n").trim() ?? "";

          if (!answer) throw new Error("Empty Gemini response.");

          usedModel = model;
          provider = "gemini";
        } catch {
          console.warn("[NOVA] Gemini failed.");
        }
      }

      // PRIMARY 3: OpenRouter
      if (!answer && !input.attachment && openrouterApiKey) {
        try {
          const model = process.env.OPENROUTER_MODEL || "openrouter/free";
          const client = new OpenAI({
            apiKey: openrouterApiKey,
            baseURL: "https://openrouter.ai/api/v1",
            timeout: 45000,
            maxRetries: 0,
          });

          const response = await client.chat.completions.create({
            model,
            messages: chatMessages,
            max_tokens: 1800,
            temperature: 0.35,
          });

          const content = response.choices[0]?.message?.content;
          answer = typeof content === "string" ? content.trim() : "";
          if (!answer) throw new Error("Empty OpenRouter response.");

          usedModel = model;
          provider = "openrouter";
        } catch {
          console.warn("[NOVA] OpenRouter failed.");
        }
      }

      // FALLBACK 1: Cloudflare Workers AI
      if (!answer && !input.attachment && cloudflareApiToken && cloudflareAccountId) {
        try {
          const model = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.1-8b-instruct";

          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareAccountId)}/ai/run/${encodeURIComponent(model)}`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cloudflareApiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: chatMessages,
                max_tokens: 1800,
                temperature: 0.35,
              }),
              signal: AbortSignal.timeout(45000),
            }
          );

          if (!response.ok) throw new Error(`Cloudflare HTTP ${response.status}`);

          const body = await response.json() as {
            success?: boolean;
            result?: { response?: string };
          };

          answer = body.result?.response?.trim() ?? "";
          if (!answer) throw new Error("Empty Cloudflare response.");

          usedModel = model;
          provider = "cloudflare";
        } catch {
          console.warn("[NOVA] Cloudflare Workers AI failed.");
        }
      }

      // FALLBACK 2: Groq
      if (!answer && !input.attachment && groqApiKey) {
        try {
          const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
          const client = new OpenAI({
            apiKey: groqApiKey,
            baseURL: "https://api.groq.com/openai/v1",
            timeout: 45000,
            maxRetries: 0,
          });

          const response = await client.chat.completions.create({
            model,
            messages: chatMessages,
            max_tokens: 1800,
            temperature: 0.35,
          });

          const content = response.choices[0]?.message?.content;
          answer = typeof content === "string" ? content.trim() : "";
          if (!answer) throw new Error("Empty Groq response.");

          usedModel = model;
          provider = "groq";
        } catch {
          console.warn("[NOVA] Groq failed.");
        }
      }

      if (!answer) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: input.attachment
            ? "NOVA could not analyse this attachment. Check OpenAI and Gemini configuration."
            : "NOVA AI providers are unavailable. Check API keys, model access, and usage limits.",
        });
      }

      return {
        answer,
        model: usedModel,
        provider,
        sources,
        researchStatus: input.mode === "quick" || input.mode === "eli10" || input.mode === "expert" || input.mode === "step"
          ? "not_requested" as const
          : sourceLookupSucceeded && sources.length > 0
            ? "sources_found" as const
            : sourceLookupSucceeded
              ? "no_sources" as const
              : "lookup_unavailable" as const,
      };
    }),
});

export const scienceRouter = router({
  papers: publicProcedure
    .input(z.object({ query: z.string().trim().min(2).max(180) }))
    .query(async ({ input }) => {
      try {
        const sources = await searchCrossref(input.query);
        return { sources, fetchedAt: new Date().toISOString(), provider: "Crossref" as const };
      } catch {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Crossref research metadata is temporarily unavailable. Try again shortly." });
      }
    }),

  earthquakes: publicProcedure.query(async () => {
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("USGS error");
      const body = (await response.json()) as {
        metadata?: { count?: number; title?: string };
        features?: Array<{ id?: string; properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }>;
      };
      const events = (body.features ?? []).flatMap(feature => {
        const props = feature.properties ?? {};
        if (typeof props.mag !== "number" || typeof props.time !== "number") return [];
        return [{
          id: feature.id ?? `${props.time}`,
          magnitude: props.mag,
          place: typeof props.place === "string" ? props.place : "Location not listed",
          time: new Date(props.time).toISOString(),
          url: typeof props.url === "string" ? props.url : url,
          coordinates: feature.geometry?.coordinates ?? [],
        }];
      });
      return { events: events.slice(0, 12), count: body.metadata?.count ?? events.length, fetchedAt: new Date().toISOString(), source: "USGS Earthquake Hazards Program", sourceUrl: url };
    } catch {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "USGS earthquake data is temporarily unavailable. No live measurements are being shown." });
    }
  }),

  apod: publicProcedure.query(async () => {
    const url = new URL("https://api.nasa.gov/planetary/apod");
    url.searchParams.set("api_key", process.env.NASA_API_KEY || "DEMO_KEY");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("NASA API error");
      const body = (await response.json()) as Record<string, unknown>;
      if (typeof body.title !== "string" || typeof body.date !== "string" || typeof body.url !== "string") throw new Error("Invalid NASA response");
      return {
        title: body.title,
        date: body.date,
        explanation: typeof body.explanation === "string" ? body.explanation : "",
        url: body.url,
        mediaType: body.media_type === "video" ? "video" as const : "image" as const,
        copyright: typeof body.copyright === "string" ? body.copyright : null,
        fetchedAt: new Date().toISOString(),
        sourceUrl: "https://apod.nasa.gov/",
      };
    } catch {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "NASA Astronomy Picture of the Day is unavailable right now. The dated telescope image elsewhere on this page is historical, not live." });
    }
  }),

  weather: publicProcedure
    .input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }))
    .query(async ({ input }) => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(input.latitude));
      url.searchParams.set("longitude", String(input.longitude));
      url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
      url.searchParams.set("timezone", "auto");
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error("Open-Meteo error");
        const body = (await response.json()) as {
          current?: Record<string, unknown>;
          current_units?: Record<string, unknown>;
          timezone?: string;
        };
        if (typeof body.current?.temperature_2m !== "number") throw new Error("No current data");
        return { current: body.current, units: body.current_units ?? {}, timezone: body.timezone ?? "Local time unavailable", fetchedAt: new Date().toISOString(), provider: "Open-Meteo" as const, sourceUrl: "https://open-meteo.com/" };
      } catch {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Open-Meteo did not return weather data for these coordinates. No current conditions are being shown." });
      }
    }),
});
