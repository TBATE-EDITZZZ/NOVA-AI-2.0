import { relations } from "drizzle-orm";
import { savedResearch, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  savedResearch: many(savedResearch),
}));

export const savedResearchRelations = relations(savedResearch, ({ one }) => ({
  owner: one(users, {
    fields: [savedResearch.userId],
    references: [users.id],
  }),
}));
