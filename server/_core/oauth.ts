import { GOOGLE_OAUTH_STATE_COOKIE, ONE_YEAR_MS, COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function requestOrigin(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (ENV.isProduction ? "https" : req.protocol);
  const host = forwardedHost || req.get("host");
  if (!host) throw new Error("Unable to determine the OAuth callback host");
  return `${protocol}://${host}`;
}

function redirectUri(req: Request): string {
  return ENV.googleRedirectUri || `${requestOrigin(req)}/api/auth/google/callback`;
}

function googleIsConfigured(): boolean {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function clearStateCookie(res: Response, req: Request) {
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: -1,
  });
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!googleIsConfigured()) {
      res.status(503).send("Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
      return;
    }

    const state = randomBytes(32).toString("base64url");
    const callbackUri = redirectUri(req);
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });

    const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_URL);
    authorizationUrl.searchParams.set("client_id", ENV.googleClientId);
    authorizationUrl.searchParams.set("redirect_uri", callbackUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");
    res.redirect(302, authorizationUrl.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const error = typeof req.query.error === "string" ? req.query.error : undefined;

    if (error === "access_denied") {
      res.redirect(302, "/");
      return;
    }
    if (!code || !state) {
      res.status(400).send("Google sign-in requires an authorization code and state.");
      return;
    }

    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_OAUTH_STATE_COOKIE];
    clearStateCookie(res, req);
    if (!expectedState || expectedState.length !== state.length || !timingSafeEqual(Buffer.from(expectedState), Buffer.from(state))) {
      res.status(403).send("Invalid Google sign-in state.");
      return;
    }

    try {
      if (!googleIsConfigured()) throw new Error("Google sign-in is not configured");
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      const tokenPayload = await tokenResponse.json() as { id_token?: string; error?: string; error_description?: string };
      if (!tokenResponse.ok || !tokenPayload.id_token) {
        throw new Error(tokenPayload.error_description || tokenPayload.error || "Google token exchange failed");
      }

      const verified = await jwtVerify(tokenPayload.id_token, GOOGLE_JWKS, {
        audience: ENV.googleClientId,
        issuer: ["https://accounts.google.com", "accounts.google.com"],
      });
      const claims = verified.payload;
      const googleSubject = typeof claims.sub === "string" ? claims.sub : "";
      const email = typeof claims.email === "string" ? claims.email : null;
      const name = typeof claims.name === "string" ? claims.name : email || "Google user";
      if (!googleSubject || !email || claims.email_verified !== true) {
        throw new Error("Google did not return a verified email identity");
      }

      const openId = `google:${googleSubject}`;
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
    } catch (caught) {
      console.error("[Google OAuth] Callback failed", caught instanceof Error ? caught.message : "unknown error");
      res.status(500).send("Google sign-in could not be completed. Check the server OAuth configuration.");
    }
  });
}
