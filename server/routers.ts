import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { savedResearch } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { novaRouter, scienceRouter } from "./science";
import { imageRouter } from "./image";

const savedSourceInput = z.object({
  title: z.string().trim().min(1).max(500),
  url: z.string().url().max(2048).refine(value => value.startsWith("https://"), "Source links must use HTTPS."),
  publisher: z.string().max(250).nullable(),
  publishedAt: z.string().max(40).nullable(),
  authors: z.array(z.string().max(200)).max(8),
});

const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The research library database is unavailable." });
    return database.select().from(savedResearch)
      .where(eq(savedResearch.userId, ctx.user.id))
      .orderBy(desc(savedResearch.updatedAt))
      .limit(100);
  }),

  save: protectedProcedure.input(z.object({
    title: z.string().trim().min(1).max(240),
    question: z.string().trim().min(2).max(4000),
    answer: z.string().min(1).max(15000),
    mode: z.enum(["quick", "deep", "eli10", "expert", "step", "compare", "discovery"]),
    sources: z.array(savedSourceInput).max(5),
  })).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The research library database is unavailable." });
    const result = await database.insert(savedResearch).values({
      userId: ctx.user.id,
      title: input.title,
      question: input.question,
      answer: input.answer,
      mode: input.mode,
      sources: input.sources,
    });
    const id = Number((result as unknown as { insertId: number }).insertId);
    if (!Number.isSafeInteger(id) || id < 1) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The research snapshot could not be saved." });
    return { id };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The research library database is unavailable." });
    await database.delete(savedResearch).where(and(eq(savedResearch.id, input.id), eq(savedResearch.userId, ctx.user.id)));
    return { deleted: true as const };
  }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The research library database is unavailable." });
    await database.delete(savedResearch).where(eq(savedResearch.userId, ctx.user.id));
    return { cleared: true as const };
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  nova: novaRouter,
  image: imageRouter,
  science: scienceRouter,
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
