// Shared between the Express server and the React client.
// Keep this file free of Node- or browser-only APIs.

export const PROVIDER_KEYS = ["Pollinations", "Stability AI", "Gemini", "Hugging Face"] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export const MODE_KEYS = ["Smart Mode", "Multi-AI Mode", "Masterpiece Mode"] as const;
export type ModeKey = (typeof MODE_KEYS)[number];

export const RATIO_KEYS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export type RatioKey = (typeof RATIO_KEYS)[number];

export const STYLE_KEYS = [
  "Photorealistic",
  "Anime",
  "Cinematic",
  "3D",
  "Fantasy",
  "Cyberpunk",
  "Digital Art",
  "Minimalist",
] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export const MAX_PROMPT_LENGTH = 1200;

/** Quality tiers per provider. The first entry is the default; the last is the best. */
export const PROVIDER_QUALITY: Record<ProviderKey, readonly string[]> = {
  Pollinations: ["Standard", "HD"],
  "Stability AI": ["Core", "Ultra"],
  Gemini: ["Fast", "Quality"],
  // Ordered fastest to best. Each tier is one open-weight model served via Hugging Face.
  "Hugging Face": ["FLUX.1 schnell", "SANA-Sprint", "SDXL", "HiDream-I1", "Qwen-Image"],
};

/** Pixel sizes (multiples of 64 so every provider accepts them). */
export const RATIO_DIMENSIONS: Record<RatioKey, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
};

export const STYLE_MODIFIERS: Record<StyleKey, string> = {
  Photorealistic: "photorealistic, natural lighting, sharp focus, realistic textures, 85mm lens",
  Anime: "anime illustration, clean line art, vibrant cel shading, expressive characters",
  Cinematic: "cinematic film still, dramatic lighting, anamorphic lens, shallow depth of field, color graded",
  "3D": "3D render, physically based materials, global illumination, octane render, high detail",
  Fantasy: "epic fantasy art, magical atmosphere, ethereal light, richly detailed, painterly",
  Cyberpunk: "cyberpunk, neon-lit, rain-slick streets, holographic signage, moody futuristic atmosphere",
  "Digital Art": "digital painting, expressive brushwork, rich color palette, polished concept art",
  Minimalist: "minimalist composition, generous negative space, restrained palette, clean geometric forms",
};

export type GeneratedImage = {
  /** `data:` URL, safe to use directly as <img src>. */
  dataUrl: string;
  mimeType: string;
  provider: ProviderKey;
  quality: string;
  seed: number;
};

export type GenerationAttempt = { provider: ProviderKey; quality?: string; ok: boolean; message?: string };

export type GenerationResult = {
  images: GeneratedImage[];
  attempts: GenerationAttempt[];
};

export type ProviderStatus = { name: ProviderKey; configured: boolean; detail: string };

/** Prompt the image model actually receives: user text plus the chosen style. */
export function buildStyledPrompt(prompt: string, style: StyleKey): string {
  return `${prompt.trim()}. Style: ${STYLE_MODIFIERS[style]}`;
}

const ENHANCE_ADDITIONS = [
  { test: /\b(light|lighting|glow|sunset|sunrise|neon|golden hour|blue hour)\b/i, add: "dramatic, atmospheric lighting" },
  { test: /\b(close-up|wide|aerial|angle|shot|composition|framing)\b/i, add: "strong, intentional composition" },
  { test: /\b(detail|detailed|intricate|texture)\b/i, add: "intricate fine detail and rich texture" },
  { test: /\b(mood|emotion|serene|tense|joy|lonely|calm|epic)\b/i, add: "a clear emotional mood" },
];

/**
 * Deterministic prompt enhancer (no network needed). Adds only the descriptors
 * the prompt does not already mention, and never exceeds MAX_PROMPT_LENGTH.
 */
export function enhancePrompt(prompt: string, style: StyleKey): string {
  const base = prompt.trim().replace(/[\s.,;]+$/, "");
  if (!base) return "";
  const additions = ENHANCE_ADDITIONS.filter((item) => !item.test.test(base)).map((item) => item.add);
  additions.push(STYLE_MODIFIERS[style].split(",").slice(0, 3).join(",").trim());
  const enhanced = `${base}, ${additions.join(", ")}, ultra high quality`;
  return enhanced.length <= MAX_PROMPT_LENGTH ? enhanced : enhanced.slice(0, MAX_PROMPT_LENGTH);
}
