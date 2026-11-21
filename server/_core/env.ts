
// Platform values are read at use time. Provider credentials remain server-only.
export const ENV = {
  // NOVA application configuration
  get appId() {
    return process.env.NOVA_APP_ID ?? "nova-ai-2.0";
  },

  // Secure session configuration
  get cookieSecret() {
    return process.env.SESSION_SECRET ?? "";
  },

  // Database
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },

  // Google OAuth
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },
  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET ?? "";
  },
  get googleRedirectUri() {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";
  },

  // Application owner
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },

  // Environment
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },

  // Optional NOVA API configuration
  get forgeApiUrl() {
    return process.env.NOVA_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.NOVA_API_KEY ?? "";
  },

  // NOVA multi-provider image generation
  get cloudflareAccountId() {
    return process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  },
  get cloudflareApiToken() {
    return process.env.CLOUDFLARE_API_TOKEN ?? "";
  },
  get pollinationsApiKey() {
    return process.env.POLLINATIONS_API_KEY ?? "";
  },
  get stabilityApiKey() {
    return process.env.STABILITY_API_KEY ?? "";
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  get geminiModelFast() {
    return process.env.GEMINI_MODEL_FAST ?? "gemini-3.1-flash-lite-image";
  },
  get geminiModelQuality() {
    return process.env.GEMINI_MODEL_QUALITY ?? "gemini-3.1-flash-image";
  },
  get huggingFaceToken() {
    return process.env.HF_TOKEN ?? "";
  },
};

