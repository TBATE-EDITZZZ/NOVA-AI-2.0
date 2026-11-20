import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  generateImage,
  listImageModels,
} from "./_core/imageGeneration";

const imageInput = z.object({
  prompt: z.string().trim().min(3).max(2000),
  quality: z.enum(["medium", "high"]).default("medium"),
  provider: z.enum([
    "auto",
    "cloudflare",
    "pollinations",
    "stability",
  ]).default("auto"),
});

export const imageRouter = router({
  generate: protectedProcedure
    .input(imageInput)
    .mutation(async ({ input }) => {
      try {
        const result = await generateImage({
          prompt: input.prompt,
          quality: input.quality,
          provider: input.provider,
        });

        if (!result.url) {
          throw new Error("The image provider returned no image.");
        }

        return {
          url: result.url,
          provider: result.provider ?? input.provider,
          mimeType: result.mimeType ?? "image/png",
        };
      } catch (error) {
        console.error("[NOVA Image Studio] Generation failed:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Image generation failed. Please try again.",
        });
      }
    }),

  models: protectedProcedure.query(async () => {
    return listImageModels();
  }),
});
