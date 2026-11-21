import { InferenceClient } from "@huggingface/inference";
import { ENV } from "./_core/env";
import {
  PROVIDER_KEYS,
  PROVIDER_QUALITY,
  RATIO_DIMENSIONS,
  buildStyledPrompt,
  type GeneratedImage,
  type GenerationAttempt,
  type GenerationResult,
  type ModeKey,
  type ProviderKey,
  type ProviderStatus,
  type RatioKey,
  type StyleKey,
} from "@shared/studio";

export type GenerateInput = {
  prompt: string;
  style: StyleKey;
  ratio: RatioKey;
  provider: ProviderKey;
  quality: string;
  mode: ModeKey;
};

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function isConfigured(provider: ProviderKey): boolean {
  switch (provider) {
    case "Pollinations":
      return Boolean(ENV.pollinationsApiKey);
    case "Stability AI":
      return Boolean(ENV.stabilityApiKey);
    case "Gemini":
      return Boolean(ENV.geminiApiKey);
    case "Hugging Face":
      return Boolean(ENV.huggingFaceToken);
  }
}

export function getProviderStatuses(): ProviderStatus[] {
  return PROVIDER_KEYS.map(name => {
    const configured = isConfigured(name);
    const detail =
      name === "Pollinations"
        ? "Server key configured"
        : configured
          ? "Server key configured"
          : name === "Stability AI"
            ? "Missing STABILITY_API_KEY"
            : name === "Gemini"
              ? "Missing GEMINI_API_KEY"
              : "Missing HF_TOKEN";
    return { name, configured, detail };
  });
}

function normalizeQuality(provider: ProviderKey, quality: string): string {
  const tiers = PROVIDER_QUALITY[provider];
  return tiers.includes(quality) ? quality : tiers[0];
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000);
}

async function readImage(response: Response, fallbackMime = "image/png") {
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error("Provider returned an empty image");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Provider image is too large");
  const header = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const mimeType = header?.startsWith("image/") ? header : fallbackMime;
  return { mimeType, dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}` };
}

async function failureMessage(response: Response): Promise<string> {
  let detail = "";
  try {
    const text = (await response.text()).slice(0, 300);
    detail = text.replace(/\s+/g, " ").trim();
  } catch {
    /* ignore */
  }
  return `HTTP ${response.status}${detail ? `: ${detail}` : ""}`;
}

type ProviderCall = (
  input: GenerateInput,
  quality: string,
  seed: number
) => Promise<Pick<GeneratedImage, "dataUrl" | "mimeType">>;

const callPollinations: ProviderCall = async (input, quality, seed) => {
  if (!ENV.pollinationsApiKey) {
    throw new Error("Missing POLLINATIONS_API_KEY");
  }

  const { width, height } = RATIO_DIMENSIONS[input.ratio];
  const params = new URLSearchParams({
    model: "black-forest-labs/flux.1-schnell",
    width: String(width),
    height: String(height),
    seed: String(seed),
  });

  const prompt = encodeURIComponent(buildStyledPrompt(input.prompt, input.style));
  const response = await fetch(
    `https://gen.pollinations.ai/image/${prompt}?${params}`,
    {
      headers: {
        Accept: "image/*",
        Authorization: `Bearer ${ENV.pollinationsApiKey}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) throw new Error(await failureMessage(response));
  return readImage(response, "image/jpeg");
};

// Stability "stable-image" endpoints only accept a fixed list of aspect ratios.
const STABILITY_RATIO: Record<RatioKey, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "5:4",
  "3:4": "4:5",
};

const callStability: ProviderCall = async (input, quality, seed) => {
  const form = new FormData();
  form.set("prompt", buildStyledPrompt(input.prompt, input.style));
  form.set("aspect_ratio", STABILITY_RATIO[input.ratio]);
  form.set("output_format", "png");
  form.set("seed", String(seed));
  const endpoint = quality === "Ultra" ? "ultra" : "core";
  const response = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.stabilityApiKey}`, Accept: "image/*" },
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(await failureMessage(response));
  return readImage(response);
};

type GeminiPart = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

// Gemini "Nano Banana" image models. NOTE: Google does not offer these on the
// free API tier, so the key must belong to a project with billing enabled.
const callGemini: ProviderCall = async (input, quality) => {
  const model = quality === "Quality" ? ENV.geminiModelQuality : ENV.geminiModelFast;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": ENV.geminiApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildStyledPrompt(input.prompt, input.style) }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: input.ratio },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (!response.ok) throw new Error(await failureMessage(response));
  const data = (await response.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) throw new Error(`Prompt blocked (${data.promptFeedback.blockReason})`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? (part.inline_data && { mimeType: part.inline_data.mime_type, data: part.inline_data.data });
    if (inline?.data) {
      const mimeType = inline.mimeType?.startsWith("image/") ? inline.mimeType : "image/png";
      return { mimeType, dataUrl: `data:${mimeType};base64,${inline.data}` };
    }
  }
  const reason = data.candidates?.[0]?.finishReason;
  throw new Error(reason && reason !== "STOP" ? `No image returned (${reason})` : "No image returned");
};

// Open-weight models reached through Hugging Face Inference Providers. Which
// third-party host actually serves each model is chosen by HF ("auto"), and
// availability changes, so a model that is not served simply fails over.
const HF_MODELS: Record<string, string> = {
  "FLUX.1 schnell": "black-forest-labs/FLUX.1-schnell",
  "SANA-Sprint": "Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers",
  SDXL: "stabilityai/stable-diffusion-xl-base-1.0",
  "HiDream-I1": "HiDream-ai/HiDream-I1-Fast",
  "Qwen-Image": "Qwen/Qwen-Image",
};

const callHuggingFace: ProviderCall = async (input, quality) => {
  const model = HF_MODELS[quality] ?? HF_MODELS["FLUX.1 schnell"];
  const { width, height } = RATIO_DIMENSIONS[input.ratio];
  const client = new InferenceClient(ENV.huggingFaceToken);
  // No seed: not every hosting provider accepts it.
  const image = await client.textToImage(
    {
      provider: "auto",
      model,
      inputs: buildStyledPrompt(input.prompt, input.style),
      parameters: { width, height },
    },
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
  );
  return readImage(new Response(image as Blob), "image/png");
};

const CALLS: Record<ProviderKey, ProviderCall> = {
  Pollinations: callPollinations,
  "Stability AI": callStability,
  Gemini: callGemini,
  "Hugging Face": callHuggingFace,
};

function errorText(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") return "Timed out";
    return error.message.slice(0, 300);
  }
  return "Unknown error";
}

async function runProvider(
  provider: ProviderKey,
  input: GenerateInput,
  quality: string,
  seed: number
): Promise<GeneratedImage> {
  const image = await CALLS[provider](input, quality, seed);
  return { ...image, provider, quality, seed };
}

/**
 * Provider order: the selected provider first, then the others. Providers that
 * are not configured are skipped (and reported in `attempts`).
 */
export function providerOrder(selected: ProviderKey): ProviderKey[] {
  return [selected, ...PROVIDER_KEYS.filter(name => name !== selected)];
}

async function generateWithFallback(
  input: GenerateInput,
  quality: string,
  attempts: GenerationAttempt[]
): Promise<GeneratedImage[]> {
  const seed = randomSeed();
  for (const provider of providerOrder(input.provider)) {
    if (!isConfigured(provider)) {
      attempts.push({ provider, ok: false, message: "Not configured" });
      continue;
    }
    // Only the selected provider uses the chosen quality; fallbacks use their default tier.
    const tier = provider === input.provider ? quality : PROVIDER_QUALITY[provider][0];
    try {
      const image = await runProvider(provider, input, tier, seed);
      attempts.push({ provider, ok: true });
      return [image];
    } catch (error) {
      attempts.push({ provider, ok: false, message: errorText(error) });
    }
  }
  return [];
}

// Multi-AI mode runs EVERY model of every configured provider (same seed, so the
// results are comparable) and returns all that succeed for the user to pick from.
const MULTI_CONCURRENCY = 6;

export function multiJobs(selected: ProviderKey) {
  return providerOrder(selected)
    .filter(isConfigured)
    .flatMap(provider => PROVIDER_QUALITY[provider].map(quality => ({ provider, quality })));
}

async function generateMulti(input: GenerateInput, attempts: GenerationAttempt[]): Promise<GeneratedImage[]> {
  const seed = randomSeed();
  const jobs = multiJobs(input.provider);
  const slots: Array<GeneratedImage | null> = jobs.map(() => null);
  const log: Array<GenerationAttempt | null> = jobs.map(() => null);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++;
      const { provider, quality } = jobs[index];
      try {
        slots[index] = await runProvider(provider, input, quality, seed);
        log[index] = { provider, quality, ok: true };
      } catch (error) {
        log[index] = { provider, quality, ok: false, message: errorText(error) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MULTI_CONCURRENCY, jobs.length) }, worker));
  log.forEach(entry => entry && attempts.push(entry));
  return slots.filter((image): image is GeneratedImage => image !== null);
}

export async function generateImages(input: GenerateInput): Promise<GenerationResult> {
  const attempts: GenerationAttempt[] = [];
  let images: GeneratedImage[];

  if (input.mode === "Multi-AI Mode") {
    images = await generateMulti(input, attempts);
  } else {
    // Masterpiece uses the highest quality tier of the selected provider.
    const tiers = PROVIDER_QUALITY[input.provider];
    const quality =
      input.mode === "Masterpiece Mode" ? tiers[tiers.length - 1] : normalizeQuality(input.provider, input.quality);
    images = await generateWithFallback(input, quality, attempts);
  }

  return { images, attempts };
}

export function summarizeFailures(attempts: GenerationAttempt[]): string {
  const failed = attempts.filter(item => !item.ok);
  if (failed.length === 0) return "No image provider is available.";
  return failed.map(item => `${item.provider}${item.quality ? ` ${item.quality}` : ""}: ${item.message ?? "failed"}`).join(" · ");
}

// ---- simple in-memory rate limiter (per client IP) -------------------------
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter(time => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [ip, times] of hits) if (times.every(time => now - time >= WINDOW_MS)) hits.delete(ip);
  }
  return true;
}
