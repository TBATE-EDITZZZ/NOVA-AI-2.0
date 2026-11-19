import OpenAI from "openai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";

const imageInput = z.object({
  prompt: z.string().trim().min(3).max(2000),
  quality: z.enum(["medium", "high"]).default("medium"),
});

export const imageRouter = router({
  generate: protectedProcedure
    .input(imageInput)
    .mutation(async ({ input }) => {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image Studio is not configured. Add OPENAI_API_KEY in Render.",
        });
      }

      try {
        const client = new OpenAI({ apiKey });

        const result = await client.images.generate({
          model: "gpt-image-2",
          prompt: input.prompt,
          quality: input.quality,
          size: "1024x1024",
        });

        const imageBase64 = result.data?.[0]?.b64_json;

        if (!imageBase64) {
          throw new Error("OpenAI returned no image data.");
        }

        return {
          url: `data:image/png;base64,${imageBase64}`,
        };
      } catch (error) {
        console.error("[NOVA Image Studio] Generation failed:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Image generation failed. Check the API configuration and try again.",
        });
      }
    }),

  models: protectedProcedure.query(() => ({
    models: [{ id: "gpt-image-2", model: "gpt-image-2" }],
  })),
});
