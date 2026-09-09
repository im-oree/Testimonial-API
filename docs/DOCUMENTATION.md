# Testimonial API — Full Product Documentation

> **Version:** 0.2.0 · **Last updated:** 2026-09-09

Testimonial API (branded **Zojatech** in the product) is a complete SaaS platform for **collecting, moderating, designing and embedding customer testimonials**. It ships as a two-tier product — a company workspace for end customers and a platform admin console for the operator — plus a public embed runtime (forms + testimonial walls) that runs on any website.

The codebase is intentionally framework-light: a plain **Node.js + Express + TypeScript** API (`server/`) and a **React + Vite + TypeScript** single-page app (`client/`). Data is seeded in memory on start so the entire product can be clicked through end-to-end immediately after `npm install && npm run dev`.

---

## Table of Contents

1. [What it is & who it's for](#1-what-it-is--who-its-for)
2. [Architecture overview](#2-architecture-overview)
3. [Core concepts](#3-core-concepts)
4. [Authentication & session model](#4-authentication--session-model)
5. [Company workspace features](#5-company-workspace-features)
   - 5.1 Apps home (your products)
   - 5.2 App overview & analytics
   - 5.3 Testimonials library
   - 5.4 Moderation queue
   - 5.5 Forms (public review collection)
   - 5.6 Wall (public testimonial wall)
   - 5.7 Widget templates & gallery
   - 5.8 Widget builder (no-code wizard)
   - 5.9 Designs gallery
   - 5.10 Design Studio (Figma-style editor)
   - 5.11 Connect / embed hub
   - 5.12 AI Studio
   - 5.13 Theme & appearance
   - 5.14 Media library
   - 5.15 Imports
   - 5.16 API keys
   - 5.17 Webhooks
   - 5.18 Team & roles (RBAC)
   - 5.19 Audit log
   - 5.20 Billing
   - 5.21 Account settings
   - 5.22 Workspace settings
6. [Public surfaces (no auth)](#6-public-surfaces-no-auth)
   - 6.1 Public review forms
   - 6.2 Public testimonial walls
   - 6.3 Theme resolution
7. [Platform admin console](#7-platform-admin-console)
   - 7.1 Overview / MRR dashboard
   - 7.2 Tenant directory & management
   - 7.3 Impersonation
   - 7.4 Platform staff & RBAC
   - 7.5 Design templates (marketplace)
   - 7.6 Theme templates
   - 7.7 Billing & invoices
   - 7.8 Webhooks
   - 7.9 Audit log (scoped + global)
   - 7.10 AI providers / tasks / costs
8. [Widget design system](#8-widget-design-system)
   - 8.1 Built-in designs
   - 8.2 Widget behavior modes
   - 8.3 Design schema & required components
   - 8.4 Draft → Preview → Publish lifecycle
9. [REST API reference](#9-rest-api-reference)
10. [Security model (DOC-6)](#10-security-model-doc-6)
11. [Configuration reference](#11-configuration-reference)
12. [Project layout](#12-project-layout)

---

## 1. What it is & who it's for

Testimonial API solves the problem of turning happy customers into visible social proof on a marketing site, blog, SaaS app or e-commerce store:

1. **Collect** — drop a public review form link on your site (or embed it) and customers rate you and leave a note.
2. **Moderate** — submissions land in a queue so spam, off-brand or low-rated reviews never show publicly.
3. **Design** — pick from a curated library of widget designs (quote cards, spotlights, 3D carousels, marquees, walls of love, orbit avatars, GLSL-shader auroras, etc.) and tune them visually in a Figma-style studio.
4. **Publish** — copy an iframe + auto-sizing script onto your site and live, approved reviews render with the chosen design.

Two audiences use the product:

| Audience | Signs in at | What they do |
|---|---|---|
| **Company users** (teams at businesses) | `/login` → company workspace | Manage one or more websites/apps, collect & moderate reviews, design & embed widgets. |
| **Platform admins** (operator, Zojatech) | `/login` → platform console | Create/manage tenant accounts, curate the template marketplace, manage staff, view MRR & global audit logs. |

Anonymous visitors also interact with the product through the **public forms** (`/forms/:slug`) and **public walls** (`/walls/:appSlug`) — no account needed.

---

## 2. Architecture overview

```
┌──────────────────────────┐          ┌───────────────────────────────┐
│  client/ (React + Vite)  │  /v1/*   │  server/ (Express + TS)       │
│  SPA on :3001            │ ───────► │  API on :3000                 │
│                          │  proxy   │                               │
│  • company workspace     │          │  • routes/auth.ts             │
│  • platform console      │          │  • routes/tenant.ts           │
│  • public form page      │          │  • routes/platform.ts         │
│  • widget runtime/embed  │          │  • routes/public.ts           │
│  • design studio         │          │  • session-tokens.ts (HMAC)   │
│  • AI studio             │          │  • demo-data.ts (seed store)  │
│  • widget library        │          │  • widget-templates.ts        │
│                          │          │  • theme.ts                   │
└──────────────────────────┘          └───────────────────────────────┘
        ▲                                        │
        │ iframe / script embed                  │ serves built client/dist
        │ (public/widget/embed.js)               │ in production (same-origin)
        ▼                                        ▼
   Any customer website                  Static hosting / Vercel
```

Key architectural decisions:

- **No monorepo tooling.** The root `package.json` only orchestrates `server/` and `client/` (each is its own npm package); a `postinstall` hook cascades `npm install` into both.
- **In-memory data.** All tenants, apps, testimonials, forms, widgets and settings live in `server/src/demo-data.ts`; restarting the server resets everything to the seed. This makes the demo runnable with zero external services.
- **Stateless bearer-token sessions.** No cookies. The API returns an HMAC-signed token on login; the client stores it in `localStorage` and sends it as `Authorization: Bearer <token>`. Tokens survive restarts via a persisted secret file (`server/.session-secret`, mode `0600`).
- **Three token channels.** In addition to `Authorization`, the API accepts `x-session-token` header and `?session_token=` query param so embedded preview iframes that strip headers still authenticate.
- **CORS off by default.** The Vite dev server proxies `/v1` to the API so the browser is always same-origin. `CORS_ORIGINS` only needs enabling when the frontend is deployed on a different domain than the API.
- **Same-origin production build.** `npm run build:client` produces `client/dist`; the Express app statically serves it and falls back to `index.html` for SPA routes, so a single Node process hosts both API and UI.

---

## 3. Core concepts

| Concept | Description |
|---|---|
| **Platform (Zojatech)** | The super-company that runs the service. Owns platform staff accounts, the template marketplace, billing and global audit. |
| **Tenant / Company / Workspace** | A customer account (e.g. "Acme Inc"). Has a plan, seats, brand theme and owner. Tenants are isolated: one tenant can never see another's data (server-enforced, 404 on foreign IDs). |
| **App / Product** | One website or surface where the company collects testimonials. Each app has its own testimonials, forms, moderation queue, widget design and public wall. A tenant can have many apps. |
| **Testimonial / Review** | A single submission. Status life-cycle: `pending` → `approved`/`rejected` → optionally `archived`. Approved reviews can be toggled `visible` without losing approval state. |
| **Form** | A public, embeddable questionnaire with questions of type `text`, `rating`, `video`, or `select`. Has a public `slug` and a `published` flag. Submissions create testimonials in `pending` state. |
| **Widget** | A specific embedded instance (script / iframe / React), tied to a form. Controls theme, accent color and CTA. Widgets are the embeddable triggers; the visual design comes from the app's design schema. |
| **Design / Widget template** | A fixed-dimension visual layout (e.g. "Quote Card", "Spotlight Hero", "3D Carousel"). Templates carry a schema the design studio edits and the embed runtime renders. |
| **Design schema** | The JSON object produced by the studio that describes layout, elements, colors, animations and behavior. Must always contain the three required components: `review_text`, `reviewer_name`, `review_rating`. |
| **Draft** | An unpublished design being worked on in the studio. Saving a draft never changes what visitors see; only an explicit *Publish* pushes the draft live. |
| **Wall** | Public page that renders all approved & visible testimonials for an app using its active design schema and behavior mode. |
| **Design options** | No-code content settings that ride along with a design: `ratingMin` (1–5), `maxReviews` (1–50), `sort` (`newest` / `highest` / `oldest`). |

---

## 4. Authentication & session model

- **Sign in:** `POST /v1/auth/login` (company) or `POST /v1/platform/auth/login` (platform). Body: `{ email, password }`. Response: `{ token, user: { email }, requiresMfa: false }`.
- **Demo MFA:** `POST /v1/auth/mfa/verify` accepts any 6 digits (demo-only).
- **Token format:** HMAC-SHA256 signed payload `kind:email[:impersonatedBy]` using a secret persisted at `server/.session-secret` (auto-generated on first run). Tokens are **not** opaque session IDs; they carry the identity and are verified statelessly on every request.
- **Token transport:**
  1. `Authorization: Bearer <token>` (primary)
  2. `x-session-token: <token>` (fallback for iframe environments)
  3. `?session_token=<token>` query param (last resort for environments that strip headers)
- **Session info:** `GET /v1/auth/me` returns the current user, tenant (brand color, logo, theme, slug), permissions array, role templates, and any active impersonation state.
- **Impersonation:** Platform admins call `POST /v1/platform/tenants/:tenantId/impersonate` to receive a company token stamped with `impersonatedBy = <admin email>`. The UI shows a blue banner; `POST /v1/auth/impersonation/exit` swaps back to a platform token for the original admin.
- **Refresh / onboarding / invite accept:** `POST /v1/auth/refresh`, `POST /v1/auth/onboarding`, `POST /v1/auth/invites/accept` exist for flow completeness; all issue fresh tokens.

### Password behavior
- Passwords are plain strings in the demo (no hashing — demo only).
- Company users can change their own password on Account settings (requires `currentPassword` + `newPassword` ≥ 6 chars).
- Platform owners/admins can reset a staff member's password without current-password proof.
- Suspended accounts (tenant members or platform staff) receive HTTP 403 on every authenticated request.

### Client storage
The React app stores the token in `localStorage` with `sessionStorage` and in-memory fallbacks (see `client/src/lib/api.ts`). On 401 it retries once with the token moved to the URL query string so iframed previews work.

---

## 5. Company workspace features

The company workspace lives under `/app/*` in the SPA. All routes require a valid company bearer token.

### 5.1 Apps home (your products) — `/app`

**Endpoint:** `GET /v1/apps` (with optional `q`, `status`, `page`, `perPage`).

Lists every app the signed-in tenant owns, sorted newest-first, with aggregate summary counts per app:

- `totalTestimonials`, `pending`, `approved`, `rejected`, `archived`
- `avgRating` (mean of approved, numeric ratings)
- `forms` count, `submissions` (total across all forms)
- `code` — product code like `PRD-AMS` (initials for multi-word names, first 4 letters for single-word)
- `widgetDesign`, `designTemplateId`, `designVersion`, `studioVersion`, `designDraft` (so the UI can badge apps that have an unpublished draft)
- `themeOverride` (per-product accent/radius/font that layer over the company theme)

Totals across the tenant (total testimonials, pending, approved, forms, submissions) are returned alongside for the header stats.

**Create app — `POST /v1/apps`**
- Fields: `name` (required, ≤ 80 chars), `websiteUrl` (optional, ≤ 300), `accentColor` (optional hex `#RRGGBB`).
- Requires `apps.manage` permission.
- Creating an app **auto-creates a ready-to-publish public review form** named `"<App name> review"` with two questions (NPS-style rating + open text), published immediately, and returns the `formSlug` so the user can start collecting right away.
- App slugs are unique across every tenant (collisions get a `-2`, `-3` suffix).

**Update app — `PATCH /v1/apps/:appId`**
- Supports renaming, setting website URL, toggling `status` (`active` / `paused`), setting per-product accent color, and per-product theme overrides (`themeAccent`, `themeRadius: sm|md|lg`, `themeFont: system|serif|mono`).
- Can also change the `widgetDesign` (one of `classic`, `spotlight`, `carousel`, `wall`, `marquee`, `orbit`), the `designTemplateId` (marketplace template), or `designOptions` (content caps).
- Requires `apps.manage`.
- Any change to `widgetDesign` or `designOptions` snapshots the previous state into `designHistory` (last 8 versions) and bumps `designVersion` so caches invalidate.

### 5.2 App overview & analytics — `/app/a/:appId/overview`

**Endpoint:** `GET /v1/dashboard/overview?appId=...` (defaults to the tenant's first app).

Returns core counts for the app: `totalPending`, `totalApproved`, `totalRejected`, `totalTestimonials`, plus a demo `conversionRate`.

The UI (see `OverviewPage.tsx`) supplements these with a **reviews-over-time Recharts line chart** (30/90/all-time, day/week/month buckets) and a **collection funnel** showing the received → approved → live-on-wall progression, all computed client-side from the testimonials list.

### 5.3 Testimonials library — `/app/a/:appId/testimonials`

**Endpoints:**
- `GET /v1/apps/:appId/testimonials` — paginated list; supports `status` filter (`pending`/`approved`/`rejected`/`archived`/`all`), `q` full-text search across author/content/tags, `page`, `perPage` (1–200, default 50). Sorted newest-first.
- `GET /v1/apps/:appId/testimonials/tags` — distinct tag list for filter chips.
- `GET /v1/apps/:appId/testimonials/export` — returns a `data:text/csv` download URL with `id,author,rating,status,content`.
- `POST /v1/apps/:appId/testimonials` — manual create. Requires `testimonials.write`. Fields: `content` (required, ≤ 2000 chars), `authorName` (≤ 120), `rating` (1–5, clamped), `status` (defaults to `approved` — manually added reviews are trusted live), `tags` (≤ 30 tags of ≤ 40 chars each), `visible` (default `true`).
- `GET /v1/apps/:appId/testimonials/:id` — single record.
- `PATCH /v1/apps/:appId/testimonials/:id` — full edit of content/author/rating/tags/visible (requires `testimonials.write`); changing `status` also requires `testimonials.moderate`.
- `DELETE /v1/apps/:appId/testimonials/:id` — requires `testimonials.moderate`.
- `POST /v1/apps/:appId/testimonials/bulk` — bulk actions with an `ids` array capped at 100:
  - `approve`, `reject`, `archive`, `delete` (require `testimonials.moderate`)
  - `show`, `hide` (toggle `visible`, require `testimonials.write`)
- `POST /v1/apps/:appId/testimonials/bulk/moderation` — batch status change restricted to currently-`pending` rows. Requires `testimonials.moderate`.

### 5.4 Moderation queue — `/app/a/:appId/moderation`

**Endpoint:** `PATCH /v1/apps/:appId/testimonials/:id/moderation`

Action-based single-review moderation. Body: `{ action: "approve"|"reject"|"archive", reason? }`.
- `approve` → `status: approved`
- `reject` → `status: rejected`, **requires** a non-empty `reason` (≤ 500 chars) and adds a `rejected` tag.
- `archive` → `status: archived`.

Requires `testimonials.moderate`. Viewers/editors cannot moderate (enforced server-side by permission check).

### 5.5 Forms — `/app/a/:appId/forms`

Forms define what visitors see when submitting a testimonial.

**Endpoints:**
- `GET /v1/apps/:appId/forms` — list all forms for the app (with `submissionCount` and `published` state).
- `POST /v1/apps/:appId/forms` — create a form. Fields: `name` (≤ 80), `slug` (≤ 60, auto-slugified from name if omitted, unique across all apps), `published` (default false), `questions` (up to 20).
- `GET /v1/apps/:appId/forms/:formId` — full form definition including all questions.
- `POST /v1/apps/:appId/forms/:formId` — full update (name/slug/published/questions).
- `PATCH /v1/apps/:appId/forms/:formId` — publish/unpublish (body `{ published: bool }`).
- `GET /v1/apps/:appId/forms/:formId/stats` — returns `submissions`, `completionRate` (68 demo), `avgRating` (4.6 demo).

Requires `forms.manage` for writes; reads are allowed for any company member.

**Questions** are normalized server-side by `normalizeQuestions()` (see `server/src/lib.ts`):
- Allowed types: `text`, `rating`, `video`, `select` (other values fall back to `text`).
- Each question gets an `id` (max 40 chars), a `label` (≤ 200, defaults to "Question N"), a `required` flag, and for `select` an `options` array (≤ 20 options, each ≤ 80 chars).

Public form access is described in [§6.1](#61-public-review-forms).

**PublicFormPage** (`/forms/:slug`) renders the form for visitors.

### 5.6 Wall — `/app/a/:appId/wall` and `/walls/:appSlug` (public)

Internally the wall page previews the public wall data; the public endpoint is `GET /v1/public/walls/:appSlug` (see [§6.2](#62-public-testimonial-walls)). From the workspace, the "Open wall" link opens the public URL in a new tab.

The wall renders:
- The company logo, tenant name, brand color and resolved theme.
- The app's active `widget` block (schema + dimensions) at the top.
- A CTA link to the published form ("Add a Review +").
- Approved & visible testimonials sorted/filtered per the design options (`sort`, `ratingMin`, `maxReviews`).

### 5.7 Widget templates & gallery — `/app/templates` and the Widget picker

**Endpoint:** `GET /v1/widget-templates` returns a catalogue of templates with their schemas, dimensions (width/height in px), names, descriptions, categories and a global `requiredFields` list (`review_text`, `reviewer_name`, `review_rating`).

The platform ships **30+ templates** across families:
- **Classics** (fixed-dimension cards): Quote Card, Spotlight Hero, Slim Strip, Rating Badge, Story Card, Bold Statement.
- **Interactive**: Swipe Deck, Coverflow Deck, Tilt Card, Aurora Glass (live GLSL shader backdrop).
- **3D carousel family (20 templates)**: coverflow depth fans, rotating 3D wheels, swipeable card stacks in palettes from neon to editorial.

On the per-app **Widget** page templates are shown paginated (6 per page). Two actions per template:
- **Apply now** — `POST /v1/apps/:appId/widget-template/:templateId/apply`: copies the template schema directly as the live design (replacing the previous one).
- **Preview & customize** — `POST /v1/apps/:appId/widget-template/:templateId/draft`: starts an unpublished draft and opens the Design Studio.

The workspace-wide **Templates gallery** (`/app/templates`) offers category pills, search and "Apply to…"/"Customize…" actions targeting any app.

### 5.8 Widget builder (no-code wizard) — `/app/builder`

**BuilderPage** is a step-by-step wizard for non-designers:
1. Pick a product (app).
2. Pick a template (from the same catalogue).
3. Configure **behavior** (cycle/carousel/coverflow/wheel/stack/tilt/marquee — see [§8.2](#82-widget-behavior-modes)), auto-advance interval, max records cap.
4. Tune **look** (colors, corner radius `sm|md|lg`, font `system|serif|mono`, text size).
5. Live preview of real approved reviews at every step.
6. Save as draft or Publish directly.

The builder writes to `designOptions` and `themeAccent/themeRadius/themeFont` on the app via `PATCH /v1/apps/:appId`.

### 5.9 Designs gallery — `/app/designs`

**Endpoint:** `GET /v1/dashboard/apps/:appId/design` returns the current `design` (designId, options, version, updatedAt) plus a `history` array of up to 8 past snapshots (version number, designId, options, savedAt).

The Designs page aggregates every app's current design in one gallery, with:
- Live mini-previews rendered by the same runtime used on the wall.
- **Draft badges** when an app has an unpublished draft, with Publish / Discard actions (Discard is a confirmed destructive action — `DELETE /v1/dashboard/apps/:appId/design/draft`).
- "New design" entry points: Templates gallery, Builder, AI Studio.

### 5.10 Design Studio — `/app/a/:appId/studio`

The studio is a Figma-style, full-bleed visual editor for the active design schema.

**Endpoints for schema editing:**
- `GET /v1/dashboard/apps/:appId/design/schema` — current live schema (or null), `studioVersion`, `updatedAt`, `designVersion`.
- `PATCH /v1/dashboard/apps/:appId/design/schema` — persist a **live** schema save (size-capped at 400 KB, must keep required components).
- `GET /v1/dashboard/apps/:appId/design/draft` — current unpublished draft.
- `PATCH /v1/dashboard/apps/:appId/design/draft` — save the draft (same size + required-component validation; **never** touches the live embed).
- `POST /v1/dashboard/apps/:appId/design/draft/publish` — **the only path that pushes a draft live**. Copies the draft into `studioSchema` and clears it.
- `DELETE /v1/dashboard/apps/:appId/design/draft` — discard the draft; the live design stays unchanged.

**Studio UX features (`client/src/design-studio/*`):**
- **Canvas runtime** (`runtime.tsx`): renders the schema identically to how the public embed will — studio and live output share the same rendering engine, so they can never drift apart.
- **Pan & zoom** (space- or middle-mouse-drag to pan, ⌘/Ctrl+wheel to zoom at cursor, Shift+0 to fit, Shift+1 for 100%).
- **Immersive mode:** sidebar collapses to icon rail, topbar hides, stage goes full-bleed.
- **Layers panel (left):** lists every element; the **+** popover adds new elements — text blocks, images, star ratings, shader backdrops, buttons.
- **Element factory** (`element-factory.ts`): creates new elements with sensible defaults.
- **Properties panel (right):** per-element controls; for rectangles/ cards supports **per-corner or linked corner radius**; for shader elements offers aurora / plasma / mesh / starfield presets with adjustable speed.
- **Entrance animations** with duration and delay per element (see `animation-presets.ts`).
- **ShaderCanvas** (`ShaderCanvas.tsx`): a WebGL canvas running GLSL shader backdrops live in the editor.
- **Behavior editor** (in properties panel for the root design): sets cycle / carousel / coverflow / wheel / stack / tilt / marquee mode plus auto-advance interval and max-records cap.
- **Save vs Publish:** Save writes the draft; only Publish changes what the embed serves. This is enforced server-side.

### 5.11 Connect / embed hub — `/app/a/:appId/embed`

The connect tab hands the user everything needed to put the widget on their site:

- A live, exact preview of what visitors will see (same runtime, real approved reviews).
- Step-by-step instructions.
- Copy-paste **iframe snippet** pointing at the wall URL.
- **Auto-sizing script** (`/widget/embed.js`) that:
  - Injects the iframe at the dimensions declared by the active template.
  - Scales the widget down proportionally on narrow viewports so fixed-dimension designs never overflow their container.
- A **modal trigger** script (`/widget/modal.js`) for opening the testimonial widget as an overlay.

If the app has no template/studio schema yet, the embed falls back to the default template from `defaultWidgetTemplate()`.

### 5.12 AI Studio — `/app/ai`

**Endpoint access:** All workbench calls are performed locally in the browser — **no external AI service**. The generator is a deterministic, seeded keyword synthesizer (`client/src/design-studio/generator.ts`).

Workflow:
1. User types a plain-English prompt, e.g. *"a dark midnight carousel with gold star ratings"*.
2. The generator parses keywords (color words, motion verbs, layout nouns, accents) and synthesizes a complete design: palette (primary/accent), behavior mode, canvas size, layout hierarchy.
3. A live preview of the synthesized design renders with real approved reviews from the selected app.
4. Buttons: **Regenerate**, **Refine** (follow-up prompt like "make the cards rounder, use violet"), **This-session history** (browse previous generations).
5. **One-click actions:** *Send to Studio as draft* or *Publish to live embed*.

### 5.13 Theme & appearance — `/app/theme` and `/app/a/:appId/theme`

Company-wide theme (DOC-7):

- `GET /v1/settings/theme` returns the resolved theme (primary, accent, radius, radiusPx, font, presetId, version, updatedAt), the preset catalogue (`presets`), the tenant's `logoUrl` and `brandColor`, plus the current company-wide `design` widget default and originating template.
- `GET /v1/settings/theme/marketplace` — the marketplace catalogue of design templates with `active: true` on the one currently adopted.
- `POST /v1/settings/theme/templates/:templateId/apply` — adopt a marketplace template as the company default; copies its palette and widget design onto the tenant and bumps its `useCount`.
- `PATCH /v1/settings/theme` — manual theme editor: accepts `presetId`, `primary`, `accent` (hex), `radius` (`sm|md|lg`), `font` (`system|serif|mono`), `logoUrl`, and optionally a `widgetDesign` to set the company default directly. Requires `settings.manage`.
- `PATCH /v1/settings/identity` — updates brand color (`/^#[0-9a-fA-F]{6}$/`) and logo URL separately.
- `PATCH /v1/settings/workspace` — renames the workspace (≤ 80 chars); slug stays immutable. Records a `settings.workspace_updated` audit entry.

Per-product theme overrides are set via `PATCH /v1/apps/:appId` (see §5.1); the public `themeForApp()` resolver layers **template → company theme → per-product overrides**.

**Theme tokens (resolved):**
- `primary` (brand), `accent`, `soft` (hex-softened primary for backgrounds)
- `radius` token + `radiusPx` (the CSS pixel value)
- `font` stack

### 5.14 Media library — `/app/media`

**Endpoints:**
- `GET /v1/media` — all saved image assets for the tenant.
- `POST /v1/media { name, url }` — add an asset. URL must be a valid `http(s)` URL; name defaults to the hostname (≤ 80 chars).
- `DELETE /v1/media/:mediaId` — remove from the list.

Media assets are URL references (not uploads in the demo). **Removing an asset only removes it from the saved list** — designs that reference the URL directly keep rendering, so deleting never breaks a published widget.

### 5.15 Imports — `/app/a/:appId/...` (imports)

**Endpoints:**
- `GET /v1/apps/:appId/imports` — list import jobs (status: `queued`/`mapping`/`processing`/`done`/`failed`, plus totalRows/importedRows).
- `POST /v1/apps/:appId/imports` — enqueue a CSV import (file name `upload.csv` in the demo). Requires `testimonials.write`.

### 5.16 API keys — programmatic access

**Endpoints:**
- `GET /v1/apps/:appId/api-keys` — list keys for the app with `prefix`, `lastUsedAt`, `createdAt`, `scopes`.
- `POST /v1/apps/:appId/api-keys { name, scopes? }` — create a key. Default scope is `testimonials.read`. Prefix is `api_live_xxxx` when write scope is granted, otherwise `api_test_xxxx`.
- `POST /v1/apps/:appId/api-keys/:keyId/rotate` — rotate (regenerate prefix/demo secret).

API-key authenticated requests are accepted by the public testimonial submission flow's spirit but the demo does not enforce key scopes beyond the prefix label.

### 5.17 Webhooks

**Endpoints:**
- `GET /v1/apps/:appId/webhooks` — list webhooks (id, name, url, events, enabled, secretMasked).
- `GET /v1/apps/:appId/webhooks/:webhookId/deliveries` — recent delivery attempts with `event`, `status` (`success`/`failed`/`retrying`), `statusCode`, `attemptedAt`.

Events include `testimonial.created`, `testimonial.approved`, `testimonial.rejected`, `testimonial.flagged`.

### 5.18 Team & roles (RBAC) — `/app/team`

**Endpoints:**
- `GET /v1/team` — the tenant's member directory with id, name, email, role, status, lastActiveAt.
- `GET /v1/team/roles` — company role templates.
- `POST /v1/team/invites { email, role }` — invite a member.
  - Requires `team.manage`.
  - Validates email format, rejects duplicates, enforces `seatsUsed < seatsLimit`.
  - Creates a team member **and** a working sign-in account (password `demo1234`) — no outbound email in the demo, so the inviter sees the credentials once in the response.
  - Writes a `team.invite_sent` audit entry.
- `PATCH /v1/team/:memberId` — change a member's `role` (`owner|admin|editor|viewer`), `status` (`active|suspended|invited`), or reset their `password`.
  - Requires `team.manage`.
  - The **owner row cannot be demoted or suspended** through this endpoint (400).
  - **Self-protection:** you cannot change your own role, status, or password here (use Account settings).
  - Records `team.role_changed`, `team.suspended`, `team.activated`, `team.password_reset` audit entries.

**Role templates** (see `COMPANY_ROLE_TEMPLATES`):
| Role | Permissions |
|---|---|
| **Owner** | apps.manage, testimonials.read/write/moderate, forms.manage, widgets.manage, team.manage, webhooks.manage, billing.view, settings.manage, audit.read |
| **Admin** | Same as owner (except ownership is not transferable through team endpoints) |
| **Editor** | testimonials.read, testimonials.write, forms.manage, widgets.manage |
| **Viewer** | testimonials.read, audit.read |

### 5.19 Audit log — `/app/audit`

**Endpoint:** `GET /v1/audit-logs` (paginated).

Returns this tenant's audit entries only — other tenants' rows never leave the server. Fields: `id, actor, action, resource, ip, createdAt, appId, tenantId`. Recorded actions include testimonial approval/rejection, form publish, team invites/role changes/suspensions, and workspace setting changes.

### 5.20 Billing — `/app/billing` (stub)

**Endpoint:** `GET /v1/billing` returns `{ plan, status, seatsUsed, seatsLimit, nextInvoiceAt, monthlyCostUsd }`. Plan is `starter` ($29), `growth` ($99), or `scale` ($299).

### 5.21 Account settings — `/app/account`

**Endpoints:**
- `GET /v1/account` — own profile (id, email, name, role, tenantName).
- `PATCH /v1/account` — update `name` (≤ 80), `email` (validated unique; changes issue a new token because tokens embed the email), or password (requires `currentPassword` and a `newPassword` of 6–100 chars; verifies current password matches).

### 5.22 Workspace settings — `/app/settings`

Combines theme editing (§5.13), identity (logo/brand color), workspace name, and account danger-zone links into one screen.

---

## 6. Public surfaces (no auth)

All public endpoints are mounted under `/v1/public/*` and serve `Access-Control-Allow-Origin: *` on GET requests so any external website can read themes and walls directly.

### 6.1 Public review forms

- **`GET /v1/public/forms/:slug`** — returns form metadata (id, slug, name, tenantName, logoUrl, brandColor, resolved theme, appName, websiteUrl, questions). Returns 404 if the form doesn't exist or isn't published.
- **`POST /v1/public/forms/:slug/submissions`** — submit a testimonial. Body: `{ answers: { [questionId]: value } }`.
  - Validates the form is published.
  - Reads only known question IDs (mass-assignment safe).
  - Clamps rating answers to integers 1–5.
  - Caps each free-text answer to 2000 chars, combined content to 5000.
  - Author name is taken from a name-like field (`name`, `name_role`, `yourName`) or defaults to `"Anonymous visitor"` (≤ 120 chars).
  - Creates a testimonial with `status: pending`, `tags: ["form"]`, linked to the originating `formId`.
  - Returns 201 `{ ok: true }`.

The SPA route `/forms/:slug` (`PublicFormPage.tsx`) renders a branded form page using the returned theme and posts to this endpoint.

### 6.2 Public testimonial walls

**`GET /v1/public/walls/:appSlug`** returns a complete wall payload:

- `tenantName`, `tenantSlug`, `brandColor`, `logoUrl`, resolved `theme`.
- `design` (widgetDesign id + designTemplateId + designOptions + designVersion).
- `app` (id, name, slug, websiteUrl).
- `form` (the first published form for this app — drives the "Add a Review +" CTA).
- `widget`:
  - `templateId`, `name`, `width`, `height` (from `schemaCanvasSize()`).
  - `schema` — the product's saved studio schema, or the default widget template if none has been saved yet (so embeds always work, even on a fresh app).
- `testimonials[]` — only `approved` rows with `visible !== false`, sorted and filtered per design options (`sort`, `ratingMin`, `maxReviews`).

### 6.3 Theme resolution

Public surfaces read themes through `themeForApp(appSlug)` which layers tokens in this order (last wins):

1. Built-in defaults (`primary: #1b2559`, `accent: #0ea5a0`, `radius: md`, `font: system`).
2. Platform/company theme preset adopted by the tenant.
3. Company theme customizations (tenant.theme).
4. Per-product overrides (`accentColor`, `themeAccent`, `themeRadius`, `themeFont`).

Each layer's `primary` is also exposed as `soft` (a softened tint) and the chosen radius is resolved to a pixel value (`radiusPx`) for the widget runtime.

---

## 7. Platform admin console

The platform console lives at `/platform/*` in the SPA. Platform staff sign in via the same `/login` page with a platform email; the API returns a `platform`-kind token.

### 7.1 Overview / MRR dashboard — `/platform/overview`

**Endpoint:** `GET /v1/platform/overview`

Aggregate platform metrics:
- `monthlyMrrUsd` (sum of `MONTHLY_BY_PLAN[plan]` across active tenants)
- `subCompanies` (total tenant count)
- Plus `tenants`, `activeApps`, `totalTestimonials`, `pendingReview` from `DEMO.mrrs()`.
- `byTenant[]`: per-tenant table with id, name, slug, plan, status, ownerEmail, monthlyCostUsd, products count, total/approved/pending testimonials, forms, responses, createdAt.

### 7.2 Tenant directory & management — `/platform/tenants`

**Endpoints:**
- `GET /v1/platform/tenants` — paginated list, supports `status` filter and `q` search across name/slug/plan.
- `POST /v1/platform/tenants` — create a tenant end-to-end (name, slug optional, plan `starter|growth|scale`, ownerName, ownerEmail).
  - Requires `tenants.write`.
  - Validates email and that the owner email isn't already claimed.
  - Creates the tenant row, an owner sign-in account (password `demo1234`), a team member row, and a platform audit entry (`tenant.created`).
  - Returns credentials once in the response.
- `GET /v1/platform/tenants/:tenantId` — detailed status including theme, per-app summaries, avgRating, seatsUsed/seatsLimit, and a 7-day `trend` (submitted vs approved per day).
- `PATCH /v1/platform/tenants/:tenantId` — change `plan` (starter/growth/scale), `status` (active/suspended/trialing), `brandColor`, `logoUrl`, or `ownerEmail`/`ownerName` (re-points the owner login + team row; validated unique).
- `PATCH /v1/platform/tenants/:tenantId/theme` — manage a tenant's DOC-7 theme from the console (same payload shape as `PATCH /v1/settings/theme`).
- `DELETE /v1/platform/tenants/:tenantId?confirm=true|1` — soft-delete (sets `status: suspended`; demo never hard-deletes seeded tenants).

### 7.3 Impersonation

**Endpoint:** `POST /v1/platform/tenants/:tenantId/impersonate` (requires `impersonate` permission).
- Returns a company token for the tenant's owner email stamped with `impersonatedBy = <admin's email>`.
- The client redirects into the company workspace and shows a fixed blue banner ("Viewing Acme Inc as Zojatech Admin") with a one-click exit.
- **Exit:** `POST /v1/auth/impersonation/exit` swaps back to a fresh platform token for the impersonating admin.

Cross-tenant access is always blocked at the API layer regardless of impersonation: foreign app IDs return 404, never an empty 200.

### 7.4 Platform staff & RBAC — `/platform/staff`

**Endpoints:**
- `GET /v1/platform/staff` — directory + `templates` (role templates). Requires `staff.read`.
- `POST /v1/platform/staff` — create a staff account (name, email, role, password ≥ 6 chars). Requires `staff.write`.
- `PATCH /v1/platform/staff/:staffId` — edit name/email/role/status/password.
  - Self-service: any staff member may update their own name/password.
  - Management (changing role/status/email of others) requires `staff.write`.
  - **No self-promotion:** you cannot change your own role, status, or email (prevents lock-out and privilege escalation).
- `DELETE /v1/platform/staff/:staffId` — remove an account. Requires `platform.manage` (super admin only); you cannot remove yourself.

Every staff write appends a platform audit entry (`staff.created`, `staff.updated`, `staff.password_changed`, `staff.password_reset`, `staff.removed`).

**Platform role templates:**
| Role | Permissions |
|---|---|
| **Super admin (`platform_owner`)** | Full control: tenants.read/write, templates.write, staff.read/write, impersonate, billing.read, audit.read/all, platform.manage |
| **Admin (`platform_admin`)** | tenants.read/write, templates.write, staff.read, impersonate, billing.read, audit.read |
| **Editor (`platform_editor`)** | tenants.read, templates.write, staff.read, audit.read |
| **Support (`platform_support`)** | tenants.read, audit.read |

### 7.5 Design templates (marketplace) — `/platform/templates`

**Endpoints:**
- `GET /v1/platform/design-templates` — list all design templates.
- `POST /v1/platform/design-templates` — create a template (`name, description, category, designId` ∈ WIDGET_DESIGN_IDS, `primary`, `accent` hex colors, `radius` sm|md|lg, `font` system|serif|mono).
- `PATCH /v1/platform/design-templates/:templateId` — update.
- `DELETE /v1/platform/design-templates/:templateId`.

Design templates are the tier-1 catalogue. Tenants adopt them on their Appearance page (tier 2) or per-product (tier 3). Each template tracks `useCount` and `builtin` (seed templates cannot be deleted directly, but updates are allowed).

### 7.6 Theme templates — `/platform/...` (theme-templates)

Same CRUD shape as design templates but for theme presets (no `designId` — just palette/radius/font/description). Managed via:
- `GET /v1/platform/theme-templates`
- `POST /v1/platform/theme-templates`
- `PATCH /v1/platform/theme-templates/:templateId`
- `DELETE /v1/platform/theme-templates/:templateId`

### 7.7 Billing & invoices — `/platform/billing`

**Endpoints:**
- `GET /v1/platform/billing` — `{ monthlyMrrUsd, invoices[] }` where invoices include id, tenantName, amountUsd, status (`paid|open|past_due`), createdAt.

### 7.8 Platform webhooks

- `GET /v1/platform/webhooks` — platform-wide webhooks (e.g. `tenant.created`, `tenant.plan_changed`).

### 7.9 Audit log — `/platform/audit`

**Endpoint:** `GET /v1/platform/audit-logs`
- Parameters: `scope=platform|all` (default `platform`), optional `tenantId` filter, pagination.
- `scope=all` merges every tenant's audit log with platform entries — requires `audit.all` permission (super admin only).
- Response includes a `tenantNames` map for UI display.

### 7.10 AI providers / tasks / costs

- `GET /v1/platform/ai/providers` — list configured providers (OpenAI, Anthropic, Google Gemini) with their models and `enabled`/`defaultModel` flags.
- `PATCH /v1/platform/ai/providers/:providerId { enabled }` — toggle (requires `platform.manage`).
- `GET /v1/platform/ai/tasks` — recent AI tasks (classify/summarize/flag) with provider, status, latencyMs, costUsd (paginated).
- `GET /v1/platform/ai/costs` — per-provider and total USD spend for the current period.

(Note: the in-app AI Studio runs locally in the browser and does not call these providers; these endpoints model the platform's view of AI moderation/analysis operations.)

---

## 8. Widget design system

### 8.1 Built-in designs

The widget runtime (`client/src/widgets/`) ships six plug-and-play designs, each rendering the same approved-review data in a different visual mode:

| ID | Name | Description |
|---|---|---|
| `classic` | Grid / Quote Cards | Clean scannable grid of review cards with avatar, stars, quote. |
| `spotlight` | Spotlight Hero | One featured review large; a secondary grid of the rest. |
| `carousel` | Rotating Carousel | Swipeable/draggable slides with touch inertia, dot + arrow nav. |
| `wall` | Wall of Love | Masonry layout of quotes, variable heights. |
| `marquee` | Scrolling Marquee | Continuous horizontal stream of short quotes; pauses on hover. Direction and speed adjustable. |
| `orbit` | Orbit Avatars | Author photos arranged in a circle; hover one to reveal their review. |

Additionally, the template catalogue ships 20+ template variants including Aurora Glass (live GLSL shader backdrop), Swipe Deck, Coverflow 3D, Tilt Card, Slim Strip, Rating Badge, Story Card, Bold Statement and a 20-template 3D carousel family across palettes from neon to editorial.

### 8.2 Widget behavior modes

Every design also carries a `behavior` that answers "what happens when more reviews come in?", edited in the studio's properties panel:

| Behavior | Effect |
|---|---|
| `cycle` | Cross-fade one review at a time on an auto-advance timer. |
| `carousel` | Swipeable/draggable slides with touch inertia, dots and arrow controls. |
| `coverflow` | 3D depth carousel leaning toward the cursor; drag or click side cards; gap/depth/rotation sliders. |
| `wheel` | A 3D ring of cards rotating around the vertical axis; drag to spin, tilts with cursor. |
| `stack` | Deck: flick the top card aside and the next swings in. |
| `tilt` | A single mouse-reactive 3D card with a cursor glare effect. |
| `marquee` | Continuous horizontal stream; direction (left/right) and speed adjustable, pauses on hover. |

All modes respect `auto-advance interval` and `maxReviews` cap to keep heavy review counts performant.

### 8.3 Design schema & required components

A design schema is an opaque JSON object owned by the studio, but the server enforces invariants via `missingWidgetFields()`: every published schema must contain bindings for three required components:

- `review_text` — the quote content
- `reviewer_name` — the author's display name
- `review_rating` — the star rating (1–5)

If a PATCH to schema (live or draft) is missing any of these, the server returns 400: *"A widget must keep its required components — add back: …"*.

Schema payloads are capped at **400 KB**.

### 8.4 Draft → Preview → Publish lifecycle

The product is deliberate about never breaking a live embed:

1. **Apply a template** → replaces the live schema immediately (use when you know you want that design).
2. **Preview & customize / Start draft** → copies the template into `designDraft`; the live schema is untouched.
3. **Studio Save** → writes the draft; live embed stays on the previously published version.
4. **Publish** (`POST .../design/draft/publish`) — **the only mutation that touches `studioSchema`**. Atomically copies the draft to live and clears it; bumps `designVersion`.
5. **Discard draft** (`DELETE .../design/draft`) — throws the draft away; live design remains.

Version history is retained for the last 8 saves in `designHistory[]` (version, designId, options, savedAt).

---

## 9. REST API reference

All endpoints live under `/v1`. Auth endpoints return a `token`; authenticated calls send `Authorization: Bearer <token>`.

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Company sign-in (email/password) → token |
| POST | `/platform/auth/login` | Platform sign-in → token |
| POST | `/auth/mfa/verify` | Demo MFA (any 6 digits) → token |
| POST | `/auth/refresh` | Heartbeat, returns `{ ok: true }` |
| POST | `/auth/onboarding` | Finish invite sign-up → token |
| POST | `/auth/invites/accept` | Accept a team invite → token |
| GET | `/auth/me` | Current session + permissions + impersonation state |
| POST | `/auth/impersonation/exit` | Swap back from impersonation → platform token |

### Company apps & designs
| Method | Path |
|---|---|
| GET | `/apps` |
| POST | `/apps` |
| PATCH | `/apps/:appId` |
| GET | `/widget-templates` |
| POST | `/apps/:appId/widget-template/:templateId/apply` |
| POST | `/apps/:appId/widget-template/:templateId/draft` |
| GET | `/dashboard/overview?appId=...` |
| GET | `/dashboard/apps/:appId/design` |
| GET | `/dashboard/apps/:appId/design/schema` |
| PATCH | `/dashboard/apps/:appId/design/schema` |
| GET | `/dashboard/apps/:appId/design/draft` |
| PATCH | `/dashboard/apps/:appId/design/draft` |
| POST | `/dashboard/apps/:appId/design/draft/publish` |
| DELETE | `/dashboard/apps/:appId/design/draft` |

### Testimonials
| Method | Path |
|---|---|
| GET | `/apps/:appId/testimonials` (status, q, page, perPage) |
| GET | `/apps/:appId/testimonials/tags` |
| GET | `/apps/:appId/testimonials/export` (CSV) |
| POST | `/apps/:appId/testimonials` |
| GET | `/apps/:appId/testimonials/:id` |
| PATCH | `/apps/:appId/testimonials/:id` |
| DELETE | `/apps/:appId/testimonials/:id` |
| PATCH | `/apps/:appId/testimonials/:id/moderation` (approve/reject/archive) |
| POST | `/apps/:appId/testimonials/bulk` (approve/reject/archive/show/hide/delete) |
| POST | `/apps/:appId/testimonials/bulk/moderation` |

### Forms, widgets, imports, keys, webhooks
| Method | Path |
|---|---|
| GET/POST | `/apps/:appId/forms` |
| GET/POST | `/apps/:appId/forms/:formId` |
| PATCH | `/apps/:appId/forms/:formId` (publish toggle) |
| GET | `/apps/:appId/forms/:formId/stats` |
| GET/POST | `/apps/:appId/widgets` |
| GET/POST/PATCH | `/apps/:appId/widgets/:widgetId` |
| GET/POST | `/apps/:appId/imports` |
| GET/POST | `/apps/:appId/api-keys` |
| POST | `/apps/:appId/api-keys/:keyId/rotate` |
| GET | `/apps/:appId/webhooks` |
| GET | `/apps/:appId/webhooks/:webhookId/deliveries` |

### Account, team, settings, audit, billing
| Method | Path |
|---|---|
| GET/PATCH | `/account` |
| GET | `/team`; POST `/team/invites`; PATCH `/team/:memberId` |
| GET | `/team/roles` |
| GET/PATCH | `/settings/theme`; POST `/settings/theme/templates/:templateId/apply` |
| GET | `/settings/theme/marketplace` |
| PATCH | `/settings/identity` |
| PATCH | `/settings/workspace` |
| GET | `/media`; POST `/media`; DELETE `/media/:mediaId` |
| GET | `/audit-logs` |
| GET | `/billing` |

### Public (no auth)
| Method | Path |
|---|---|
| GET | `/public/theme-presets` |
| GET | `/public/theme/:appSlug` |
| GET | `/public/forms/:slug` |
| POST | `/public/forms/:slug/submissions` |
| GET | `/public/walls/:appSlug` |

### Platform
| Method | Path |
|---|---|
| GET | `/platform/overview` |
| GET/POST | `/platform/tenants` |
| GET/PATCH/DELETE | `/platform/tenants/:tenantId` |
| PATCH | `/platform/tenants/:tenantId/theme` |
| POST | `/platform/tenants/:tenantId/impersonate` |
| GET | `/platform/widget-templates` |
| GET/POST/PATCH/DELETE | `/platform/design-templates(/:id)` |
| GET/POST/PATCH/DELETE | `/platform/theme-templates(/:id)` |
| GET/POST/PATCH/DELETE | `/platform/staff(/:staffId)` |
| GET | `/platform/billing` |
| GET | `/platform/webhooks` |
| GET | `/platform/audit-logs` |
| GET/PATCH | `/platform/ai/providers(/:providerId)` |
| GET | `/platform/ai/tasks` |
| GET | `/platform/ai/costs` |

### Health
| Method | Path |
|---|---|
| GET | `/health` → `{ ok: true, name, time }` |

---

## 10. Security model (DOC-6)

The demo is hardened against every attack surface it exposes and ships an automated security test suite (`server/test/security.test.ts`, runnable via `npm run test:security`). Highlights:

- **Cross-tenant isolation.** Every app-scoped route resolves the app through `requireTenantOfApp()`; foreign IDs return **404**, not an empty 200 — so the existence of another company's resources isn't even confirmed (IDOR defense, DOC-6 §2.4).
- **RBAC at the handler level.** Reads/writes/moderation/team/settings/billing are separate permissions mapped by role template.
- **Viewer/editor cannot moderate.** Moderation endpoints require `testimonials.moderate` (owner/admin only in the demo).
- **Tampered tokens → 401.** HMAC verification in `session-tokens.ts` rejects any token whose signature doesn't match the persisted secret.
- **Input hygiene.**
  - Ratings clamp to integers 1–5.
  - Free-text fields are length-capped (content ≤ 2000 chars, combined submission ≤ 5000, names ≤ 120, tags ≤ 40, slugs ≤ 60, etc.).
  - Questions per form capped at 20; bulk action `ids` capped at 100.
  - Request body size limited by `express.json({ limit: '1mb' })`.
  - Schema saves capped at 400 KB.
  - Unknown question types fall back to `text`; only known question IDs are read on submission (mass-assignment defense).
- **Self-protection on account/team endpoints.** You can't demote/suspend the tenant owner, can't change your own role/status via Team management, and platform staff can't remove their own account.
- **Suspended accounts** (tenant or platform) receive 403 on every authenticated call.
- **Security headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-XSS-Protection: 0` (legacy).
- **Error responses never leak internals.** All errors flow through the central error handler; non-`HttpError` exceptions become a generic 500 with "Internal server error."
- **Session secret:** persisted to `server/.session-secret` with mode `0600`, git-ignored; auto-generated on first run.
- **CORS off by default;** opt-in via `CORS_ORIGINS`. Public GET endpoints intentionally return `Access-Control-Allow-Origin: *` because they serve only approved public content.
- **Safe logging.** Request logs strip the query string before logging so `?session_token=` never lands in logs; only a short token prefix is logged.
- **Password validation** (min 6, max 100 chars, current password required for self-service changes).

The security suite runs in CI via `.github/workflows/ci.yml` and blocks merges on failure.

---

## 11. Configuration reference

### Server (`server/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `SESSION_SECRET` | *(auto-generated)* | HMAC signing secret for tokens. |
| `SESSION_SECRET_FILE` | `server/.session-secret` | Where the auto-generated secret is persisted. |
| `CORS_ORIGINS` | *(off)* | Comma-separated allowed origins (or `*` for any origin — dev only). |

The server loads `.env` and then `.env.local` via a zero-dependency parser (`server/src/env.ts`); real environment variables always win.

### Client (`client/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:3000` | Dev server proxy target for `/v1` requests. |
| `VITE_API_BASE` | *(same origin)* | Absolute API URL for deployed frontends (set when API and app are on different origins). |
| `VITE_PORT` | `3001` | Vite dev server port. |

---

## 12. Project layout

```
Testimonial-API/
├── package.json              # Root orchestrator (concurrently + cascading install)
├── README.md                 # Quick-start README
├── DEPLOYMENT.md             # Deployment notes
├── vercel.json               # Monorepo-friendly Vercel config
├── next.md                   # Forward-looking notes
├── docs/
│   ├── DOCUMENTATION.md      # ← you are here
│   ├── integration-test-guide.md
│   └── images/               # README/documentation imagery
├── server/                   # Express + TS API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts          # HTTP server entry (binds HOST/PORT)
│       ├── app.ts            # Express app: CORS, security headers, JSON, routes, SPA fallback, error handler
│       ├── env.ts            # Zero-dep .env loader
│       ├── lib.ts            # HttpError, auth guards, app-scoping, pagination, question normalization
│       ├── session-tokens.ts # HMAC stateless tokens + secret persistence (0600)
│       ├── demo-data.ts      # In-memory seeded store (tenants, apps, testimonials, forms, widgets, team, webhooks, keys, imports, audit, billing, staff, AI)
│       ├── theme.ts          # Theme presets + resolution + patch parsing
│       ├── widget-templates.ts # 30+ widget template schemas, required-field validation, canvas-size helpers
│       └── routes/
│           ├── auth.ts       # Login, MFA, refresh, me, impersonation exit
│           ├── tenant.ts     # All company-workspace endpoints
│           ├── platform.ts   # Platform admin console endpoints
│           └── public.ts     # Public forms/walls/themes (no auth)
│   └── test/
│       └── security.test.ts  # DOC-6 automated security suite (node --test)
├── client/                   # React + Vite + TS SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts        # /v1 proxy to API
│   ├── vercel.json
│   ├── index.html
│   ├── .env.example
│   ├── public/
│   │   ├── _redirects        # Netlify SPA fallback
│   │   ├── zojatech-logo.svg
│   │   ├── external/acme.html
│   │   └── widget/
│   │       ├── embed.js      # Auto-sizing iframe embed script
│   │       └── modal.js      # Modal trigger script
│   └── src/
│       ├── main.tsx          # React entry
│       ├── App.tsx           # Routes (react-router)
│       ├── auth.tsx          # Auth context / session provider
│       ├── styles.css        # Global styles (plain CSS)
│       ├── lib/
│       │   ├── api.ts        # Fetch wrapper with bearer-token + URL fallback
│       │   ├── format.ts     # Formatting helpers
│       │   ├── theme.ts      # Client theme tokens
│       │   ├── types.ts      # Shared TS types
│       │   └── useAppName.ts
│       ├── components/       # Layout shell, modals, fields, UI primitives, icons, brand loader
│       ├── design-studio/    # Figma-style editor: store, runtime, generator, CSS, snap-engine, shaders, animation presets, element factory, data-binder
│       ├── widgets/          # Widget runtime: index, primitives, TemplateWidget, designs (classic, spotlight, carousel, wall, marquee, orbit), designs.css
│       └── pages/            # All routes: Login, AppsHome, Overview, Testimonials, Moderation, Forms, Wall, Templates, Embed, Builder, Designs, DesignStudio, Media, Ai, Theme, Team, Audit, Account, Settings, Connect, PublicForm, NotFound, CompanyOverview
│           └── platform/     # Platform console: Overview, Tenants, TenantDetail, Staff, Templates, PlatformAudit, CreateStaff/ManageStaff/CreateTenant modals
└── legacy/                   # Previous Next.js + NestJS monorepo (kept for reference)
```
