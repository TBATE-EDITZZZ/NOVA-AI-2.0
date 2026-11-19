import { index, uniqueIndex, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the Manus OAuth flow.
 * Application-owned workspace records use this numeric key for row ownership.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  emailVerifiedAt: timestamp("email_verified_at"),
  emailVerificationTokenHash: varchar("email_verification_token_hash", { length: 64 }),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetTokenHash: varchar("password_reset_token_hash", { length: 64 }),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type SavedResearchMode = "quick" | "deep" | "eli10" | "expert" | "step" | "compare" | "discovery";
export type SavedSource = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  authors: string[];
};

/** Research snapshots are private, durable, and always scoped to the owning account. */
export const savedResearch = mysqlTable("saved_research", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  mode: mysqlEnum("mode", ["quick", "deep", "eli10", "expert", "step", "compare", "discovery"]).default("quick").notNull(),
  sources: json("sources").$type<SavedSource[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerUpdatedIndex: index("saved_research_owner_updated_idx").on(table.userId, table.updatedAt),
}));

export type SavedResearch = typeof savedResearch.$inferSelect;


/** External identity connections. Provider identities belong to one NOVA user. */
export const authAccounts = mysqlTable("auth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google", "github"]).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => ({
  providerIdentityUnique: uniqueIndex("auth_provider_identity_unique").on(table.provider, table.providerAccountId),
  userIndex: index("auth_accounts_user_idx").on(table.userId),
}));

export type AuthAccount = typeof authAccounts.$inferSelect;

/** Persistent conversations. Attachment contents are deliberately not stored here. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: SavedSource[];
  researchStatus?: string;
  attachmentName?: string;
  mode?: SavedResearchMode;
  error?: boolean;
};

export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  messages: json("messages").$type<ChatMessage[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerUpdatedIndex: index("chat_conversations_owner_updated_idx").on(table.userId, table.updatedAt),
}));

export type ChatConversation = typeof chatConversations.$inferSelect;
