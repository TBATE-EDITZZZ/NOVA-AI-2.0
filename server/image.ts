import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { generateImage, listImageModels } from "./_core/imageGeneration";
import {
  generateImages,
  getProviderStatuses,
  summarizeFailures,
} from "./imageProviders";
import {
  MAX_PROMPT_LENGTH,
  MODE_KEYS,
  PROVIDER_KEYS,
  RATIO_KEYS,
  STYLE_KEYS,
} from "@shared/studio";

const imageInput = z.object({
  prompt: z.string().trim().min(3).max(2000),
  quality: z.enum(["medium", "high"]).default("medium"),
  provider: z.enum(["auto", "cloudflare", "pollinations", "stability"]).default("auto"),
});

const studioInput = z.object({
  prompt: z.string().trim().min(3).max(MAX_PROMPT_LENGTH),
  style: z.enum(STYLE_KEYS),
  ratio: z.enum(RATIO_KEYS),
  provider: z.enum(PROVIDER_KEYS),
  quality: z.string().min(1).max(40),
  mode: z.enum(MODE_KEYS),
});

export const imageRouter = router({
  // Existing NOVA image generation — preserved.
  generate: protectedProcedure.input(imageInput).mutation(async ({ input }) => {
    try {
      const result = await generateImage({
        prompt: input.prompt,
        quality: input.quality,
        provider: input.provider,
      });

      if (!result.url) throw new Error("The image provider returned no image.");

      return {
        url: result.url,
        provider: result.provider ?? input.provider,
        mimeType: result.mimeType ?? "image/png",
      };
    } catch (error) {
      console.error("[NOVA Image] Generation failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Image generation failed.",
      });
    }
  }),

  // Existing model list — preserved.
  models: protectedProcedure.query(async () => listImageModels()),

  // New Image Studio provider status.
  providers: protectedProcedure.query(async () => getProviderStatuses()),

  // New multi-provider Image Studio generation.
  studioGenerate: protectedProcedure
    .input(studioInput)
    .mutation(async ({ input }) => {
      try {
        const result = await generateImages(input);

        if (!result.images.length) {
          throw new Error(summarizeFailures(result.attempts));
        }

        return result;
      } catch (error) {
        console.error("[NOVA Image Studio] Generation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error
            ? error.message
            : "Image generation failed. Please try again.",
        });
      }
    }),
});
