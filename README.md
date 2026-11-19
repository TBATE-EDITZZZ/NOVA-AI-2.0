# DISCOVERY ENGINE

**Every Question Opens a New Universe.** DISCOVERY ENGINE is a responsive scientific exploration workspace powered by NOVA AI (Neural Observation & Verification Assistant).

## Development

The project uses React, Vite, TypeScript, Tailwind CSS, Wouter, tRPC/Express and managed MySQL. Use the project-pinned pnpm toolchain.

```sh
pnpm dev                 # development server, honoring PORT (default 3000)
pnpm check               # TypeScript diagnostics
pnpm test                # isolated application tests
pnpm build && pnpm start # production build and server
pnpm db:migrate          # apply checked-in additive migrations
```

## Working modules

The current implementation includes the responsive observatory-themed shell and home page; NOVA's seven interaction modes, session-scoped follow-ups, image/PDF input, Markdown reports, citations returned from Crossref in research modes, optional browser-native speech controls, and sign-in-gated save actions; live Earthquake, NASA APOD and user-authorized Open-Meteo data; Crossref search; science topic explorer; interactive Three.js solar-system view; an ideal projectile-motion model; Gemini-backed educational experiment-plan drafts; CSV analysis/visualization; the knowledge graph; and a Learning Center with quizzes, flashcards and browser-local progress.

NOVA sends prompts to Google Gemini from the server using the protected `GEMINI_API_KEY`. The default is `gemini-3.1-flash-lite`, which passed a minimal generation check in this runtime; `gemini-3.8-flash` was available in the model catalog but its generation request stalled beyond the 45-second timeout here. The optional `GEMINI_MODEL` override is server-only and should name a model that supports `generateContent` for the configured key. Keep credentials in protected project environment settings, never in browser code, committed `.env`, or logs. Without a valid credential the service reports an error instead of substituting a pretend AI response. The integration and request protections are in `server/science.ts`.

Deep Research, Compare & Analyse, and Discovery ask Crossref for real bibliographic metadata. Displayed records link to DOI URLs; Crossref metadata is explicitly not described as proof of a paper's findings. Quick explanations do not claim a source search. External source/API freshness and attribution are recorded in `research-sources.md`.

The live dashboard reads the public USGS all-day earthquake feed and NASA Astronomy Picture of the Day (NASA `DEMO_KEY` fallback); Open-Meteo is called only after the visitor chooses to share device location. Records are shown with retrieval times, source links and provider errors. The selected Webb “Cosmic Cliffs” image is an attributed historical observation, not live telescope data. The solar-system rendering and projectile motion lab are labelled illustrations/models, not real measurements.

CSV files are handled in the browser and are not uploaded or persisted. Image/PDF questions accept files up to 4 MB; the attachment is sent to Gemini only with the submitted prompt and is not stored by the application. Current NOVA conversation history is tab-scoped in `sessionStorage`. Signed-in users can save selected answer snapshots (question, response, mode and returned citation metadata) to the owner-scoped My Library and delete one or clear all their saved reports. The additive `saved_research` table is migrated in the managed MySQL database; account data is isolated by authenticated user ID. Learning completion remains local to the browser, not account-synchronized.

## Scope and remaining work

This is a functional first phase, not the entire original exhibition-scale roadmap. Other requested modules—additional 3D anatomy/cell/atom/molecule models, chemistry and biology experiments, Environmental/space publication sources beyond those wired, PubMed/OpenAlex, advanced agent orchestration and evidence-conflict review, image-interpretation quality controls, admin analytics, account-synced learning/preferences, broader accessibility/localization, voice support outside browser-native availability, and additional equation, glossary, mission and project tools—remain incomplete. `TODO.md` preserves the full original feature clauses; review it before treating any unimplemented capability as available.

## Secrets and data safety

`server/_core/publicConfig.ts` exposes only named public runtime values; Gemini, database, and Google OAuth credentials remain server-side. The project uses Google's official OpenID Connect flow for account login, validates local app sessions, and sends only the authenticated owner ID to private workspace queries. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and (for production) `GOOGLE_OAUTH_REDIRECT_URI`; the redirect URI must be registered in Google Cloud Console as `/api/auth/google/callback`. Files are not retained. Public API outages are surfaced honestly; NOVA answers should not be interpreted as verified scientific conclusions or safety-certified instructions.

The initial runtime uses port 3000 and the managed server/database features. `app.config.ts` contains the platform's durable HTTPS logo asset URL. Read `plan.md`, `TODO.md`, and `research-sources.md` for the approved architecture, complete request scope and research provenance.


NOVA enforces a best-effort ceiling of 10 requests per minute per authenticated user (or reported connection IP for guests) within one server worker. This in-memory guard is not a cross-instance quota and resets when a worker restarts; global billing-grade quotas/admin monitoring remain future work.
