# DISCOVERY ENGINE — Implementation Plan

## Product and implementation approach

Build the approved scientific discovery platform in the initialized React 19, TypeScript, Vite, Tailwind, Framer Motion, Express, tRPC, Drizzle, and managed MySQL project. The main user journey is Home → NOVA research → Explore/visualize/simulate → save or continue learning. Main navigation remains consistent across modules. Use modular client pages/components, typed tRPC procedures, server-only API adapters and deterministic database migrations; do not put provider secrets in browser bundles.

Phase 1 prioritizes the connected product shell, distinctive homepage and a functional NOVA entry point. Then implement source-backed scientific discovery/research and public live science modules; interactive Explorer and simulation experiences; visualization/data/experiment tools; and learning, accounts, saved research, and admin controls. Retain every requested feature in `TODO.md`; only mark an outcome complete when the behavior exists and is evidenced. Credential-gated capabilities must show specific setup/error states, never invented results. The user explicitly requested Google Gemini, so NOVA uses a server-side Gemini adapter and a protected `GEMINI_API_KEY` input; do not silently substitute another provider. Account access uses Google's official OpenID Connect flow with server-side `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and an HTTPS callback URI. Use public providers where no credential is required and attribute timestamps, source, and freshness.

Scientific sources/adapters begin with reliable public endpoints appropriate to each module (for example USGS earthquake GeoJSON, Open-Meteo, NASA/APOD when available, and Crossref/OpenAlex metadata); responses are validated, attributed and timestamped, and stale/error states remain explicit. No invented citations, fake research progress, purported live data, or simulated experiments represented as measurements. Research is only described as completed once its actual server operation has succeeded. Initial simulations identify their parameters and educational/illustrative limits.

## Design

**Design Movement:** Contemporary scientific instrument interface with restrained orbital / observatory motifs.

**Core Principles:** High information signal with generous breathing room; scientific provenance is visible at the point of use; motion is purposeful and quiet; mobile and keyboard interaction receive equal care.

**Color Philosophy:** Near-black and graphite surfaces establish a focused lab environment. A signature ultraviolet hue signals NOVA and active research, with electric blue for navigation and a limited cyan accent for measured data and status. Light mode preserves the same semantic hierarchy on warm, pale neutral surfaces rather than simply inverting every color.

**Layout Paradigm:** Editorial observatory: a wide, asymmetrical hero and instrument-like query console lead into horizontally flowing discovery bands, then focused module workspaces. Navigation stays compact; research work surfaces can use a contextual rail instead of a generic centered dashboard grid.

**Signature Elements:** A custom orbital “N” mark; hairline orbit arcs and sparse particle field; luminous but restrained source/status chips.

**Interaction Philosophy:** Every interactive control returns meaningful feedback. Search, mode, simulation parameters, and filters visibly affect content. Real work reports actual progress and source receipts; unavailable credentials and failed upstream services are described directly.

**Animation:** Preserve slow orbital movement and sparse hero particles. Add a short, original cinematic title reveal with the exact title `TBA_TE_EDITZZZ`, dramatic kinetic typography, a red-to-violet light sweep and restrained particle/VFX layers; evoke streaming-service title pacing without copying Netflix branding. The intro must auto-dismiss, be skippable and collapse to a brief fade for reduced-motion users. Route changes and interactive controls receive crisp 160–300ms transitions plus tactile click feedback. Add quiet, synthesized UI sound effects behind a visible mute toggle; never autoplay sound on load. Keep continuous motion out of reading/data views and honor `prefers-reduced-motion`.

**Typography System:** Space Grotesk for display and headings, paired with Inter for interface/body text; tabular numerals for metrics and data. Use a clear six-step hierarchy, restrained uppercase labels, and readable mobile sizes.

**Brand Essence:** A provenance-first AI research instrument for curious learners and science explorers; precise, exploratory, trustworthy.

**Brand Voice:** Clear, curious, grounded. Examples: “The universe is full of questions.” “Trace each result back to its source.”

**Wordmark & Logo:** Bespoke wordmark paired with an orbital N: one offset planet/node and a fine elliptical trajectory; animated only on load/hover and with reduced-motion fallback.

**Signature Brand Color:** Observatory ultraviolet `#8B6CFF`.

## Application structure

- `client/src/App.tsx`: registered page routes and shared providers.
- `client/src/pages/`: Home, NOVA, Discovery, Explorer, Lab, Live Intelligence, Research, Visualization, Knowledge, Learning Center, Personal Library, and 404 views.
- `client/src/components/`: reusable navigation, source cards, query controls, charts, simulation controls and accessible primitives.
- `client/src/components/science/`: focused interactive models and simulation modules, loaded only where used.
- `client/src/index.css`: responsive brand tokens, dark/light surfaces, motion and accessibility rules.
- `server/routers.ts` and `server/science.ts`: typed public/protected API surface and validated Gemini/science-provider adapters.
- `server/db.ts`, `drizzle/schema.ts`, `drizzle/`: account-owned saved research and additive migrations.
- `client/public/`: static website assets and `manus-routes.json`, served from the configured Vite public directory.
- `README.md`, `.env.example`, `plan.md`, `TODO.md`: setup, deployment, planned design/implementation and unresolved outcomes.

## Delivery approach

Use the current managed development port and server/database. Keep OAuth sessions compatible with the starter and public HTTPS Preview (`webdev_app_session`, validated platform session, `SameSite=None; Secure` where application cookies are set). Public routes remain accessible as guest where appropriate; private saved work and admin operations are permission-checked server-side. CSV/document/image handling is size/type validated and does not claim unsupported analysis. Add only needed dependencies, preserve the pinned pnpm policy, use deterministic additive migrations, and document provider keys without storing values in files. Set the project platform `logoUrl` to a durable HTTPS asset before checkpointing. Run host TypeScript diagnostics, relevant existing checks and production build; start the managed server and verify HTTP readiness plus the route manifest. Outstanding modules remain visibly open in `TODO.md` rather than being presented as finished.
