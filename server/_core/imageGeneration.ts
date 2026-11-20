import { ENV } from "./env";

export type ImageProvider = "cloudflare" | "pollinations" | "stability" | "auto";

export type GenerateImageOptions = {
  prompt: string;
  provider?: ImageProvider;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  model?: string;
  quality?: string;
};

export type GenerateImageResponse = {
  url?: string;
  provider?: string;
  mimeType?: string;
};

type GeneratedImage = {
  buffer: Buffer;
  mimeType: string;
};

const MODELS = [
  { model: "cloudflare", id: "@cf/black-forest-labs/flux-1-schnell" },
  { model: "pollinations", id: "black-forest-labs/flux.1-schnell" },
  { model: "stability", id: "stable-image-core" },
];

function checkPrompt(prompt: string) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Please enter an image prompt.");
  }
  if (prompt.length > 2000) {
    throw new Error("Image prompt must be 2000 characters or less.");
  }
}

async function readImage(response: Response): Promise<GeneratedImage> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `API error ${response.status}: ${detail.slice(0, 500) || response.statusText}`,
    );
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";

  if (!mimeType.startsWith("image/")) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Provider returned non-image data: ${detail.slice(0, 300)}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType,
  };
}

async function generateCloudflare(prompt: string, quality?: string): Promise<GeneratedImage> {
  if (!ENV.cloudflareAccountId || !ENV.cloudflareApiToken) {
    throw new Error("Cloudflare credentials are not configured.");
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${ENV.cloudflareAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.cloudflareApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      steps: quality === "high" ? 8 : 4,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Cloudflare ${response.status}: ${detail.slice(0, 400)}`);
  }

  const result = await response.json() as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: { image?: string };
  };

  if (!result.result?.image) {
    throw new Error(result.errors?.[0]?.message || "Cloudflare returned no image.");
  }

  return {
    buffer: Buffer.from(result.result.image, "base64"),
    mimeType: "image/jpeg",
  };
}

async function generatePollinations(prompt: string): Promise<GeneratedImage> {
  if (!ENV.pollinationsApiKey) {
    throw new Error("Pollinations API key is not configured.");
  }

  const endpoint = new URL(
    `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`,
  );

  endpoint.searchParams.set("model", "black-forest-labs/flux.1-schnell");
  endpoint.searchParams.set("width", "1024");
  endpoint.searchParams.set("height", "1024");
  endpoint.searchParams.set("nologo", "true");

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${ENV.pollinationsApiKey}`,
      Accept: "image/*",
    },
  });

  return readImage(response);
}

async function generateStability(prompt: string): Promise<GeneratedImage> {
  if (!ENV.stabilityApiKey) {
    throw new Error("Stability AI API key is not configured.");
  }

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("aspect_ratio", "1:1");
  form.append("output_format", "png");

  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.stabilityApiKey}`,
        Accept: "image/*",
      },
      body: form,
    },
  );

  return readImage(response);
}

const PROVIDERS: Record<
  Exclude<ImageProvider, "auto">,
  (prompt: string, quality?: string) => Promise<GeneratedImage>
> = {
  cloudflare: generateCloudflare,
  pollinations: generatePollinations,
  stability: generateStability,
};

export async function generateImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResponse> {
  checkPrompt(options.prompt);

  if (options.originalImages?.length) {
    throw new Error(
      "Image editing is not supported by this text-to-image integration yet.",
    );
  }

  const requested = options.provider ?? "auto";
  const order: Exclude<ImageProvider, "auto">[] =
    requested === "auto"
      ? ["cloudflare", "pollinations", "stability"]
      : [requested];

  const errors: string[] = [];

  for (const provider of order) {
    try {
      const generated = await PROVIDERS[provider](
        options.prompt,
        options.quality,
      );

      if (!generated.buffer.length) {
        throw new Error("Provider returned an empty image.");
      }

      const base64 = generated.buffer.toString("base64");

      return {
        url: `data:${generated.mimeType};base64,${base64}`,
        provider,
        mimeType: generated.mimeType,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      errors.push(`${provider}: ${message}`);

      console.error(`[NOVA Image Engine] ${provider} failed:`, message);

      if (requested !== "auto") {
        throw new Error(`${provider} image generation failed: ${message}`);
      }
    }
  }

  throw new Error(
    `All NOVA image providers failed. ${errors.join(" | ")}`,
  );
}

export type ImageModelInfo = {
  model?: string;
  id?: string;
};

export type ListImageModelsResponse = {
  models: ImageModelInfo[];
};

export async function listImageModels(): Promise<ListImageModelsResponse> {
  return { models: MODELS };
}
