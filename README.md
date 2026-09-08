# Testimonial API — demo app

A standard web app for collecting and moderating customer testimonials:

- **`server/`** — backend API: plain **Node.js + Express + TypeScript**. No framework magic, no monorepo.
- **`client/`** — frontend: plain **React + Vite + TypeScript** single-page app.

Data is **in-memory and seeded** on start (demo accounts, forms, testimonials), so you can click through the whole product instantly. Restarting the server resets the data.

## Run it

```bash
npm install
npm run install:all   # installs deps inside server/ and client/

npm run dev           # starts BOTH: API on :3000, web app on :3001
```

Then open **http://localhost:3001**.

| What | Where |
| --- | --- |
| Web app | http://localhost:3001 |
| API | http://localhost:3000 (proxied from the web app at `/v1/...`, so the browser is always same-origin) |
| API health | http://localhost:3000/health |

Or run them separately: `npm run dev:server` and `npm run dev:client`.

## Demo accounts (one-click buttons on the login page)

| Role | Email | Password | Goes to |
| --- | --- | --- | --- |
| Company (Acme Inc) | `owner@acme.test` | `demo1234` | `/app` — the company's apps |
| Platform (Zojatech) | `admin@zojatech.test` | `demo1234` | `/platform/overview` |

There is no landing page — `/` redirects to `/login`.

## The model: companies → apps → testimonials & forms

A company (tenant) collects testimonials for **apps — one app per website**. Each app
has its own isolated testimonials, moderation queue and public forms.

- Sign in as **Company** → **Your apps**: Acme already has *Acme Marketing Site* and
  *Acme Blog*. Open an app to manage its dashboard, or click **＋ New app** to add
  another website — a ready-to-publish public review form is created with it.
- The platform (**Zojatech**) is the super company: **Tenants → a company → Open as
  company** drops you into that company's workspace (blue impersonation banner,
  one-click exit), while companies can never see another company's data
  (server-enforced — foreign apps return 404).

## The widget system (the product's output)

The point of the app: **templated, editable widgets** you embed on any website.

- **Templates** (`GET /v1/widget-templates`) — a catalogue of fixed-dimension
  designs (Quote Card 720×560, Spotlight Hero 1200×420, Slim Strip 1200×200,
  Rating Badge 360×320, Story Card 540×760, Bold Statement 800×600, Swipe Deck
  640×480, Coverflow Deck 960×540, Tilt Card 560×460, Aurora Glass 720×560).
  Every template carries the **required rating components** — `review_text`,
  `reviewer_name`, `review_rating` — plus decorative extras (Aurora Glass
  includes a live **GLSL shader** backdrop).
- **Pick one** on the product's **Widget** page — *Apply now* switches the
  embed immediately, or *Preview & customize* starts an **unpublished draft**
  (`POST /v1/apps/:appId/widget-template/:id/draft`) and opens the studio.
  In the studio, **Save writes the draft and Publish is the only step that
  changes the live embed** — preview, customise and save without applying.
- **The studio is a Figma-style editor** — real pan/zoom (space- or middle-drag
  to pan, ⌘/Ctrl+wheel to zoom at the cursor, Shift+0 to fit, Shift+1 for 100%),
  an immersive full-bleed stage (app sidebar collapses to the icon rail, the
  topbar hides), a layers-first left panel with element adding behind a ＋
  popover, per-corner **or** linked corner radius, GLSL **shader elements**
  (aurora / plasma / mesh / starfield presets with adjustable speed), and
  entrance animations with duration/delay.
- **Widget behavior** — the answer to "what happens when more reviews come in?"
  Each design carries a `behavior` edited in the studio's properties panel and
  executed by the live widget: **cycle** (cross-fade, one review at a time),
  **carousel** (swipeable/draggable slides with touch inertia, dots + arrows),
  **coverflow** (a 3D depth carousel that leans toward the cursor — drag it or
  click a side card), **tilt** (a mouse-reactive 3D card with cursor glare),
  or **marquee** (a continuous stream — direction left/right and speed
  adjustable, pauses on hover). Auto-advance interval and a max-records cap
  keep heavy review counts light.
- **Embed it** — the Widget page hands you the drop-in iframe and auto-sizing
  script. The embed (`/widget/embed.js`) sizes itself to the template's exact
  dimensions, and the wall inside renders the product's saved schema with its
  behavior over its live approved reviews — the same runtime the studio preview
  uses, so editing and live output can never drift apart.

## Try the full loop

1. Click **Company workspace · Acme Inc** on `/login` → you land on **Your apps**.
2. Open **Acme Blog** (or create a new app for another website) → **Forms → Open ↗**
   and submit a response on the public page.
3. Back in that app's **Moderation** the submission is waiting → Approve or Reject it.
4. Approvals move to that app's **Testimonials**; toggling a form to **Draft**
   unpublishes it so it stops accepting submissions.
5. Sign out, then sign in as the **platform admin** to see every tenant and
   impersonate one.

## Security & tests (DOC 6)

The demo is hardened against every attack surface that exists in it and ships an
automated security suite. See **`docs/06-immune-system-status.md`** for the full
DOC-6 requirement → status map.

```bash
npm run typecheck       # server + client
npm run test:security   # IDOR / RBAC / token-tamper / impersonation / input hygiene
npm run build:client
```

The security suite also runs in CI (`.github/workflows/ci.yml`) and blocks merges on
failure. Highlights: cross-tenant access to any entity → 404, viewer/editor cannot
moderate, tampered tokens → 401, ratings clamp to 1–5, free text is length-capped,
security headers are set, error responses never leak internals, the session signing
secret is 0600 + git-ignored.

## How auth works (no cookies)

The API returns a session **token** on login (`POST /v1/auth/login`). The web app
stores it in `localStorage` (with sessionStorage + in-memory fallbacks) and sends it
as `Authorization: Bearer <token>` — plus an `x-session-token` header and, on a 401,
retries with the token in the URL (`?session_token=`) so embedded preview iframes
that strip headers still work. Tokens are HMAC-signed with a secret persisted at
`server/.session-secret`, so sessions survive API restarts.

## API at a glance

Everything is under `/v1` (public docs live in the code — see `server/src/routes/`):

- `POST /v1/auth/login`, `POST /v1/platform/auth/login`, `GET /v1/auth/me`
- `GET|POST /v1/apps`, `PATCH /v1/apps/:appId` (company's apps — one per website)
- `GET /v1/widget-templates`, `POST /v1/apps/:appId/widget-template/:templateId/apply`,
  `POST /v1/apps/:appId/widget-template/:templateId/draft`,
  `GET|PATCH /v1/dashboard/apps/:appId/design/draft`, `POST .../design/draft/publish`,
  `DELETE .../design/draft` (catalogue + apply; draft/customise/publish flow —
  `PATCH .../design/schema` and draft saves both enforce the required
  components — review text, reviewer name, rating)
- `GET|POST|PATCH|DELETE /v1/apps/:appId/testimonials[...]` — list (paged, filtered, searchable),
  manual create, full edit (content/author/rating/tags), live on-wall toggle (`visible`),
  moderation moves, delete, `POST .../bulk` (approve/reject/archive/show/hide/delete)
  and `POST .../bulk/moderation`
- `GET|POST|PATCH /v1/apps/:appId/forms[...]` (list, create, publish)
- `GET /v1/platform/overview`, `GET|PATCH /v1/platform/tenants[...]`,
  `POST /v1/platform/tenants/:tenantId/impersonate`, `POST /v1/auth/impersonation/exit`
- `GET /v1/public/forms/:slug`, `POST /v1/public/forms/:slug/submissions` (no auth)

The previous Next.js + NestJS codebase is preserved under **`legacy/`** for reference.

## Folder map

```
server/                 Express API
  src/index.ts          entry point
  src/app.ts            express app + security headers + error handling
  src/routes/           auth.ts · tenant.ts · platform.ts · public.ts
  src/lib.ts            auth + app-scoping guards (404 on foreign apps)
  src/session-tokens.ts HMAC-signed stateless tokens (+ persisted secret)
  src/demo-data.ts      in-memory seed store (tenants, apps, forms, testimonials)
  test/security.test.ts DOC 6 security suite (node --test)
client/                 React SPA
  src/main.tsx          entry point
  src/App.tsx           routes (/app · /app/a/:appId/… · /platform · /forms/:slug)
  src/pages/            apps home, app overview/testimonials/moderation/forms, login, platform…
  src/components/       layout shell (app switcher) + small UI pieces
  src/lib/api.ts        fetch helper with bearer-token + URL fallback
  src/styles.css        global styles (plain CSS)
docs/                   DOC 6 status map (this demo vs the production spec)
legacy/                 old Next.js + NestJS monorepo (kept for reference)
```
