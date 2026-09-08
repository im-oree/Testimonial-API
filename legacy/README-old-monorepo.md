TESTIMONIAL API

> **📚 Engineering docs:** this repository is implemented as a six-part series in [`docs/00-roadmap.md`](docs/00-roadmap.md). **Doc 1 (🦴 Skeleton) is built and verified** — start at [`docs/01-skeleton.md`](docs/01-skeleton.md), and see the sign-off checklist at [`docs/01-skeleton-checklist.md`](docs/01-skeleton-checklist.md). This README remains the v1.0 *product* master spec (requirements, plans, flows, security posture).

---

## Repository quickstart (engineering)

Monorepo: `apps/api` (NestJS backend), `apps/worker` (async jobs), `packages/*`
(shared domain/types/config), `infra/*` (SQL + Firestore schema), `scripts/*`
(seed + migration tooling).

```bash
npm ci

# --- Firestore (prototype) mode: run the emulator, seed, boot ---
# (Java 11+ required for the Firebase emulator)
npm run emulators            # see apps/api/firebase.json — starts Firestore on :8080
npx tsx scripts/seed-firestore.ts
DATABASE_PROVIDER=firebase npm run dev --workspace=@testimonial-api/api
curl localhost:3000/v1/health   # {"databaseEngine":"firebase"}

# --- Postgres (production) mode: flip ONE env var, zero code changes ---
psql "$DATABASE_URL" -f infra/postgres/schema.sql
psql "$DATABASE_URL" -f infra/postgres/seed.sql
npm run db:generate
DATABASE_PROVIDER=postgres npm run dev --workspace=@testimonial-api/api

# --- Verify the Doc-1 checklist (162 static checks) ---
npx tsx scripts/check-doc1.ts
```

Hexagonal rule: services/controllers depend only on repository *interfaces*
(`packages/domain`), never on a DB SDK — the storage engine is chosen solely by
`DATABASE_PROVIDER` in the DI container (`apps/api/src/infrastructure/database`).
ESLint `repo-boundaries` rules fail CI on any violation.

Full Technical & Product Specification (v1.0)
Prepared for: Zojatech (subsidiary of iThorizons Nigeria Limited)
Product name: Testimonial API (generic, white-label-safe, reusable across clients)
Document type: Master specification — architecture, data, security, API, UI, operations

0. Document Conventions
Term	Meaning
Platform	The root system, owned/operated by Zojatech. Also called "Host" or "Parent."
Platform Admin	A staff member of Zojatech with access to the Platform Dashboard.
Tenant	A company/client using Testimonial API (a "sub-company").
Tenant Staff	Employees of a Tenant with access to the Tenant Dashboard.
App	A product/project belonging to a Tenant. Each App has its own credentials, testimonials, widgets. Also called "Project" in UI copy.
Public Key	Browser-safe key (pk_*) — read-only, origin-restricted.
Secret Key	Server-only key (sk_*) — full CRUD, never origin-restricted.
Widget	A configured, renderable output (carousel/grid/wall/etc.) built from a Template + filters + style.
Template	A platform-defined, versioned blueprint for either a Widget or a Collection Form.
Collection Form	A public-facing page/embed used to request testimonials from end customers.
1. Executive Summary
Testimonial API is a multi-tenant, API-first SaaS platform that lets the Platform Owner (Zojatech) onboard client companies ("Tenants"), each of whom can register one or more Apps/Products. Each App gets a unique credential pair used to collect, manage, moderate, and display customer testimonials — via a hosted API, embeddable widgets, no-code snippets, or full SDKs.

Core pillars:

One secure backend, zero direct DB exposure — Firestore is never touched by any frontend or third party. All access is mediated by a single Node.js API service enforcing auth, RBAC, quotas, and validation.
Runtime-configurable security — allowed origins, rate limits, feature flags, IP rules are all editable live from the dashboard with zero redeploys and zero hardcoding.
Template-driven design system — platform-curated, beautifully designed Widget & Form templates that Tenants configure, never build from scratch (but can override with raw code if they're developers).
Full spectrum of integration effort — from a single <script> tag (no-code) to a typed Node/React SDK (full-code), with the same API underneath.
Governed automation — AI-assisted import of testimonials from social platforms, always entering a human-moderation queue before going public.
Strict RBAC at two levels — Platform staff roles and Tenant staff roles, each modular, permission-based, and reflected live in the UI.
2. System Hierarchy
text

TESTIMONIAL API (Platform / Zojatech)
│
├── Platform Admins ............. RBAC-controlled staff of Zojatech
├── Global Widget Templates ..... versioned, reusable design blueprints
├── Global Form Templates ....... versioned collection-form blueprints
├── Plans & Feature Flags ........ Free / Pro / Enterprise, toggled per tenant
├── Runtime Config Engine ........ origins, rate limits, IP rules (live-editable)
│
└── Tenants (Companies) [1..N]
     ├── Tenant Staff (RBAC) ..... owner, admin, editor, contributor, viewer
     ├── Branding ................ logo, accent color, custom domain (optional)
     ├── Billing / Plan
     │
     └── Apps / Products [1..N]
          ├── Credentials ........ App ID, pk_live/test, sk_live/test
          ├── Allowed Origins .... runtime-managed CORS whitelist
          ├── Quotas ............. testimonials/mo, widgets max, seats
          ├── Testimonials [1..N]. manual / form / api / social-import
          ├── Collection Forms [1..N]
          ├── Widgets [1..N] ..... instances of Templates + config
          ├── Integrations ....... Twitter/X, Webhooks, Zapier, CSV
          └── API Keys audit / rotation history
3. High-Level Architecture
text

                         ┌────────────────────────┐
                         │   Frontend Apps (SPA)   │
                         │  - Platform Dashboard   │
                         │  - Tenant Dashboard     │
                         │  - Public Form Pages    │
                         └───────────┬─────────────┘
                                     │ HTTPS (session cookie / JWT)
                                     ▼
                     ┌───────────────────────────────┐
                     │      API GATEWAY / LB          │  (Cloud Run + Cloud LB)
                     └───────────────┬───────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────┐
        │            TESTIMONIAL API — Core Service            │
        │            (NestJS, modular monolith)                │
        │  Modules: auth, platform, tenants, apps, testimonials│
        │  templates, widgets, forms, integrations, billing,   │
        │  webhooks, realtime, audit, notifications             │
        └───────┬───────────┬───────────┬───────────┬─────────┘
                │           │           │           │
                ▼           ▼           ▼           ▼
          ┌─────────┐ ┌───────────┐ ┌────────┐ ┌────────────┐
          │Firestore│ │   Redis    │ │  GCS   │ │  BullMQ /  │
          │(Admin   │ │ cache/rate │ │ media  │ │Cloud Tasks │
          │SDK only)│ │ limit/pubsub│ │storage │ │(job queue) │
          └─────────┘ └───────────┘ └────────┘ └─────┬──────┘
                                                       ▼
                                        ┌───────────────────────────┐
                                        │  Worker Service (async)    │
                                        │  - Social scraping + AI    │
                                        │  - Webhook delivery+retry  │
                                        │  - Email/notification send │
                                        │  - Stats aggregation       │
                                        └───────────────────────────┘

  External consumers of Public API:
  - widget.js (CDN script)                 - @testimonial-api/react
  - @testimonial-api/node (server SDK)      - Tenant's own backend
  - Zapier / Make.com                        - curl / any language (REST)
Why one backend, not two: A single service means one place for RBAC, one place for rate limiting, one audit trail, one billing meter, and one security review surface. Tenants integrating "directly" still always call this API — either from their frontend (via public key, origin-restricted) or from their own backend (via secret key, unrestricted but IP-loggable). Nothing ever talks to Firestore except this service's Admin SDK.

4. Technology Stack
Layer	Choice	Reasoning
Language	TypeScript everywhere	shared types front/back, safety
API Framework	NestJS (Node 20)	modular, DI, guards/interceptors map perfectly to RBAC + multi-tenancy
Database	Firebase Firestore (Native mode)	matches stated requirement, real-time capable server-side
Cache / Rate limit / Pub-Sub	Redis (Memorystore)	needed for runtime config, rate limiting, socket fan-out
Object storage	Google Cloud Storage	avatars, video testimonials, CSV imports
Queue / Jobs	Cloud Tasks + BullMQ (Redis-backed)	async AI scraping, webhook retries, digest emails
Auth identity	Firebase Authentication	email/password, Google SSO, magic link
Hosting (API)	Cloud Run (2 services: api, worker)	stateless, autoscale, container-based
Hosting (Frontends)	Vercel or Firebase Hosting (static SPA/Next.js)	fast CDN edge delivery
Realtime to browser	Socket.IO (on api service or separate realtime Cloud Run service)	scoped event push, not raw Firestore listeners
Frontend framework	Next.js (App Router) + React + TypeScript	SSR for public/widget pages, SPA for dashboards
UI kit	Tailwind CSS + shadcn/ui + Radix primitives	minimal, composable, themeable
Charts	Recharts	as requested, dashboard analytics
Animation	Framer Motion (sparingly)	micro-interactions only
Email	Postmark or Resend	transactional (invites, digests, alerts)
Secrets	Google Secret Manager + KMS	OAuth tokens, webhook secrets envelope-encrypted
CI/CD	GitHub Actions → Cloud Build → Cloud Run	monorepo-aware pipelines
Monitoring	Cloud Logging + Sentry + Uptime checks	error tracking + infra health
API Docs	OpenAPI 3.1 auto-generated from NestJS decorators, rendered via Mintlify/Redocly	dev portal
Monorepo layout (Turborepo/Nx):

text

/apps
  /api                → NestJS backend (dashboard + public API + webhooks)
  /worker              → async job processor
  /platform-dashboard  → Next.js app for Zojatech staff
  /tenant-dashboard    → Next.js app for tenant staff (shared shell w/ platform)
  /docs                → developer documentation site
  /widget-runtime      → the embeddable widget.js (vanilla, compiled small bundle)
/packages
  /shared-types        → DTOs, enums, zod schemas shared FE/BE
  /ui                  → shared design system components
  /sdk-node
  /sdk-react
  /cli
/infra
  /terraform           → GCP infra as code
  /firestore.rules
  /firestore.indexes.json
5. Full Data Model (Firestore)
Notation: collection/{docId} and nested subcollections. All timestamps are Firestore Timestamp. All docs have createdAt, updatedAt, createdBy unless noted.

5.1 platformAdmins/{uid}
TypeScript

{
  uid: string;                  // Firebase Auth UID
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'support' | 'billing' | 'developer' | 'read_only';
  permissions: string[];        // explicit overrides, merged with role defaults
  status: 'invited' | 'active' | 'disabled';
  twoFactorEnabled: boolean;
  lastLoginAt: Timestamp | null;
  invitedBy: string | null;
}
5.2 tenants/{tenantId}
TypeScript

{
  tenantId: string;             // e.g. "tnt_9f82a1"
  name: string;
  slug: string;                 // unique, used in custom subdomain: {slug}.testimonialapi.app
  logoUrl: string | null;
  brandColor: string;           // hex, applied as CSS var in tenant dashboard & widgets
  customDomain: string | null;  // optional CNAME target, verified via TXT record
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'pending_setup';
  ownerEmail: string;
  billing: {
    stripeCustomerId: string | null;
    currentPeriodEnd: Timestamp | null;
  };
  usage: {                      // denormalized, updated by worker for fast dashboard reads
    testimonialsThisMonth: number;
    appsCount: number;
    staffCount: number;
  };
}
5.3 tenants/{tenantId}/staff/{uid}
TypeScript

{
  uid: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer';
  permissions: string[];
  status: 'invited' | 'active' | 'disabled';
  invitedAt: Timestamp;
  activatedAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
}
5.4 tenants/{tenantId}/apps/{appId}
TypeScript

{
  appId: string;                 // e.g. "app_7c1e9b" — PUBLIC, used in embeds
  name: string;
  description: string | null;
  environment_defaults: 'live' | 'test';
  status: 'active' | 'disabled';
  quotas: {
    testimonialsPerMonth: number;
    widgetsMax: number;
    formsMax: number;
    seatMax: number;
  };
  security: {
    allowedOrigins: string[];    // ["https://acme.com", "*.acme.io"]
    ipAllowList: string[] | null;
    requireCaptchaOnForms: boolean;
  };
  keys: {
    publicKeyLive: string;       // pk_live_xxx (stored plain — safe, public by design)
    publicKeyTest: string;       // pk_test_xxx
    secretKeyLiveHash: string;   // argon2 hash — plain shown once at creation only
    secretKeyTestHash: string;
    keyVersion: number;          // incremented on rotation
  };
}
5.5 tenants/{tenantId}/apps/{appId}/testimonials/{testimonialId}
TypeScript

{
  id: string;
  environment: 'live' | 'test';
  author: {
    name: string;
    title: string | null;
    company: string | null;
    avatarUrl: string | null;
    email: string | null;         // internal only, never exposed via public API
  };
  content: {
    message: string;
    rating: number | null;        // 1-5, nullable if ratingType = 'nps' or 'none'
    ratingType: 'star5' | 'nps' | 'thumbs' | 'none';
    mediaUrls: string[];          // images
    videoUrl: string | null;
  };
  source: 'manual' | 'form' | 'api' | 'twitter_import' | 'csv_import';
  sourceRef: string | null;        // e.g. tweet ID, form submission ID
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  moderation: {
    reviewedBy: string | null;
    reviewedAt: Timestamp | null;
    rejectionReason: string | null;
  };
  tags: string[];
  featured: boolean;
  order: number;                   // manual sort weight
  customFields: Record<string, string>;
  fingerprint: string;             // hash(author+message) for dedupe
  language: string;                // detected via AI, for i18n filtering
}
5.6 tenants/{tenantId}/apps/{appId}/collectionForms/{formId}
TypeScript

{
  id: string;
  name: string;
  slug: string;                    // public URL: /f/{tenantSlug}/{slug}
  templateId: string;              // ref to global form template
  status: 'draft' | 'active' | 'paused';
  config: {
    questions: Array<{
      id: string;
      type: 'text' | 'textarea' | 'rating' | 'video' | 'photo' | 'select';
      label: string;
      required: boolean;
      options?: string[];
    }>;
    ratingType: 'star5' | 'nps' | 'thumbs' | 'none';
    collectVideo: boolean;
    collectConsent: boolean;         // "I agree this may be used publicly"
    redirectUrlOnSuccess: string | null;
    styleOverrides: Record<string, string>;
  };
  submissionCount: number;
}
5.7 tenants/{tenantId}/apps/{appId}/widgets/{widgetId}
TypeScript

{
  id: string;
  name: string;
  templateId: string;               // ref to global widget template
  layoutType: 'carousel' | 'grid' | 'wall' | 'spotlight' | 'badge' | 'video_wall';
  filter: {
    tags: string[];
    minRating: number | null;
    status: 'approved';             // hardcoded server-side, not client-overridable
    featuredOnly: boolean;
    limit: number;
  };
  styleOverrides: Record<string, string | number | boolean>;
  embedType: 'script' | 'iframe' | 'react';
  isPublished: boolean;
}
5.8 templates/{templateId} (global, platform-managed)
TypeScript

{
  id: string;
  type: 'widget' | 'form';
  name: string;
  description: string;
  previewImageUrl: string;
  isPremium: boolean;                // gated by plan
  version: number;
  configSchema: Array<{
    key: string;
    label: string;
    type: 'color' | 'boolean' | 'number' | 'text' | 'select' | 'font';
    default: any;
    options?: string[];
  }>;
  componentRef: string;              // maps to compiled renderer bundle name
  status: 'active' | 'deprecated';
}
5.9 integrations/{tenantId}_{appId}_{provider}
TypeScript

{
  tenantId: string;
  appId: string;
  provider: 'twitter' | 'google_reviews' | 'producthunt' | 'slack' | 'zapier' | 'webhook';
  credentialsEncrypted: string;      // KMS envelope-encrypted blob
  config: {
    keywords?: string[];
    handle?: string;
    syncFrequency?: 'hourly' | 'daily' | 'manual';
  };
  status: 'connected' | 'error' | 'disabled';
  lastSyncAt: Timestamp | null;
  lastError: string | null;
}
5.10 webhookEndpoints/{id} (per app, outbound)
TypeScript

{
  tenantId: string;
  appId: string;
  url: string;
  secret: string;                    // used to sign X-Signature header
  events: string[];                  // ['testimonial.created','testimonial.approved',...]
  status: 'active' | 'disabled';
  failureCount: number;
}
5.11 webhookDeliveries/{id}
TypeScript

{
  webhookEndpointId: string;
  event: string;
  payload: object;
  responseStatus: number | null;
  attempt: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  nextRetryAt: Timestamp | null;
  createdAt: Timestamp;
}
5.12 invites/{token}
TypeScript

{
  token: string;                     // random 32-byte, url-safe
  email: string;
  scope: 'platform' | 'tenant';
  tenantId: string | null;
  role: string;
  expiresAt: Timestamp;               // default now + 72h
  usedAt: Timestamp | null;
  revoked: boolean;
  invitedBy: string;
}
5.13 auditLogs/{id}
TypeScript

{
  actorId: string;
  actorType: 'platform_admin' | 'tenant_staff' | 'api_key' | 'system';
  actorLabel: string;                 // resolved name/email for display
  action: string;                     // 'testimonial.approve', 'app.rotate_key', etc.
  targetType: string;
  targetId: string;
  tenantId: string | null;
  ip: string;
  userAgent: string;
  metadata: Record<string, any>;
  createdAt: Timestamp;
}
5.14 apps/{appId}/stats/summary (denormalized, worker-maintained)
TypeScript

{
  totalTestimonials: number;
  approvedCount: number;
  pendingCount: number;
  avgRating: number;
  bySource: Record<string, number>;
  byMonth: Record<string, number>;    // "2025-01": 34
  updatedAt: Timestamp;
}
5.15 Recommended Firestore composite indexes
testimonials: (status ASC, environment ASC, createdAt DESC)
testimonials: (featured DESC, order ASC)
testimonials: (tags ARRAY_CONTAINS, status ASC)
auditLogs: (tenantId ASC, createdAt DESC)
webhookDeliveries: (status ASC, nextRetryAt ASC)
6. Firestore Security Rules (defense-in-depth, even though clients never connect directly)
JavaScript

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny-all. Only the Admin SDK (backend service account)
    // bypasses these rules entirely. This block exists purely as a
    // secondary safety net in case a client SDK is ever misconfigured.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
No exceptions, no client paths. This is intentional and documented so future developers never "helpfully" open a path.

7. Authentication Architecture
7.1 Identity provider
Firebase Authentication is the identity source of truth for humans only (Platform Admins + Tenant Staff). Supported methods: email/password, Google OAuth, passwordless magic link. Machines (Apps) never use Firebase Auth — they use API keys (§9).

7.2 Login flow (humans)
text

1. Browser → Firebase Auth SDK → obtains Firebase ID Token (short-lived JWT)
2. Browser → POST /v1/auth/session { idToken }
3. Backend verifies idToken via Firebase Admin SDK
4. Backend looks up user in platformAdmins/ or tenants/*/staff/ (checked in that order)
5. Backend builds internal session payload:
   { uid, type: 'platform'|'tenant', tenantId?, role, permissions[] }
6. Backend issues:
   - access_token   (JWT, 15 min expiry) → HttpOnly, Secure, SameSite=Strict cookie
   - refresh_token  (opaque, 30 days, stored hashed in Redis) → HttpOnly cookie
7. Browser never sees Firebase tokens again; all further requests use the cookie.
7.3 Session refresh
POST /v1/auth/refresh — validates refresh token against Redis store (allows instant revocation), rotates both tokens (rotation-on-use prevents replay), extends session.

7.4 Logout / revocation
POST /v1/auth/logout deletes the Redis refresh-token entry and clears cookies. Platform Admins can force-logout any user (DELETE /v1/platform/sessions/:uid) — deletes all their Redis sessions instantly, which combined with 15-min access token expiry means a revoked user is fully locked out within 15 minutes max, or immediately if paired with the realtime kill-switch (§13.4).

7.5 Multi-Factor Authentication
Optional TOTP-based 2FA (via speakeasy/otplib), enforceable per-role (e.g., Platform Owners/Admins required, Tenant Owners recommended). Backup codes generated and stored hashed.

8. API Key Architecture (machine auth)
8.1 Key format
text

pk_live_<22 random base62 chars>     public, live
pk_test_<22 random base62 chars>     public, sandbox
sk_live_<32 random base62 chars>     secret, live
sk_test_<32 random base62 chars>     secret, sandbox
Prefix encodes both purpose (public/secret) and environment (live/test) — enables fast routing/validation and prevents accidental prod use in dev.

8.2 Storage
Public keys stored in plaintext (they're meant to be public, like a Stripe pk_).
Secret keys stored as argon2id hashes only; the plaintext is shown exactly once at generation time in the dashboard, with a "copy now, you won't see this again" warning — identical UX to Stripe/GitHub tokens.
8.3 Verification flow (every public API request)
text

1. Extract X-Api-Key header (or Authorization: Bearer)
2. Determine key type from prefix
3. Redis lookup: key hash → { tenantId, appId, environment, status }  (cache, TTL 5 min)
4. Cache miss → Firestore lookup → populate cache
5. If public key: enforce Origin header check against app.security.allowedOrigins
6. If secret key: skip origin check, log source IP always
7. Enforce rate limit bucket (per key, per plan tier)
8. Enforce quota (testimonialsPerMonth etc.) for write operations
9. Attach { tenantId, appId, environment, keyType } to request context
10. Proceed to controller
8.4 Rotation & revocation
POST /v1/dashboard/apps/:appId/keys/rotate — generates new key immediately, old key enters a grace period (configurable, default 24h) where both work, then old key is force-invalidated. Immediate hard revoke also available (?immediate=true) for compromised-key scenarios. Every rotation is audit-logged and optionally triggers an email + webhook (api_key.rotated) to the tenant owner.

9. Runtime Configuration Engine
This is the mechanism satisfying "manage security/origins at runtime, not hardcoded."

9.1 Config domains managed at runtime
Config	Scope	Storage	Cache key	Invalidation trigger
Allowed Origins	per App	Firestore apps/{id}.security.allowedOrigins	cfg:origins:{appId}	on save, publish event
Rate limits	per Plan, overridable per App	Firestore plans/{plan} + apps/{id}.rateLimitOverride	cfg:ratelimit:{appId}	on save
IP allow/block	Platform-wide + per App	Firestore	cfg:iprules:global / :app:{id}	on save
Feature flags	per Plan, overridable per Tenant	Firestore plans/{plan}.features	cfg:flags:{tenantId}	on save
API key status	per key	Redis primary, Firestore backup	cfg:key:{hash}	on rotate/revoke
Maintenance mode	global or per tenant	Firestore + Redis	cfg:maintenance	admin toggle
9.2 Propagation pattern
Every config write goes through a single RuntimeConfigService.update(domain, scopeId, value):

Write to Firestore (source of truth, survives cache flush).
Immediately write-through to Redis (so the next request anywhere, on any instance, sees it — no TTL wait).
Publish a Redis Pub/Sub event config:changed:{domain}:{scopeId} — all Cloud Run instances subscribe and can invalidate any local in-memory secondary cache (e.g. LRU) if used.
If the config affects an already-open dashboard session (e.g. staff permissions), also emit a WebSocket event to affected connected clients (§13).
This gives sub-second, global, zero-downtime config propagation with no redeploys and no hardcoded values anywhere in code.

10. Authorization / RBAC — Full Specification
10.1 Principle
Roles are presets; permissions are the actual enforcement unit. A user's effective permission set = roleDefaults[role] ∪ explicitGrants − explicitRevokes. This allows fine-tuning (e.g., an "editor" who's also allowed to manage integrations) without inventing a new role.

10.2 Platform-level permission catalogue
text

platform.tenants.create
platform.tenants.suspend
platform.tenants.delete
platform.tenants.impersonate      (support access into a tenant, fully audited)
platform.staff.invite
platform.staff.manage
platform.templates.manage
platform.plans.manage
platform.flags.manage
platform.security.manage          (IP rules, global rate limits)
platform.audit.view
platform.billing.view
platform.billing.manage
10.3 Platform role → permission defaults
Role	Key permissions
owner	all permissions
admin	all except billing.manage, plans.manage
support	tenants.impersonate (read-mostly), audit.view
billing	billing.view, billing.manage
developer	templates.manage, flags.manage, security.manage
read_only	*.view only
10.4 Tenant-level permission catalogue
text

tenant.staff.invite
tenant.staff.manage
tenant.apps.create
tenant.apps.manage           (edit settings, quotas view)
tenant.apps.rotate_keys
tenant.testimonials.read
tenant.testimonials.write
tenant.testimonials.approve
tenant.testimonials.delete
tenant.forms.manage
tenant.widgets.manage
tenant.integrations.manage
tenant.branding.manage
tenant.billing.view
tenant.billing.manage
tenant.webhooks.manage
10.5 Tenant role → permission defaults
Role	Key permissions
owner	all tenant permissions
admin	all except billing.manage, staff.manage(remove-owner)
editor	testimonials.*, forms.manage, widgets.manage
contributor	testimonials.write, testimonials.read (no approve/delete)
viewer	*.read only
10.6 Enforcement
NestJS Guard @Permissions('tenant.testimonials.approve') reads the request-scoped user context (populated in §7.2 step 5) and checks membership in the effective permission set — recomputed fresh from Firestore/Redis on every request (never trusted purely from the JWT, since JWT could be briefly stale after a permission change; JWT carries a permVersion number that's checked against a live Redis counter for cheap staleness detection).

10.7 Live UI reflection
On permission change (staff role edited, or user demoted), backend:

Increments permVersion for that user in Redis.
Emits WebSocket event user:{uid}:permissions_changed.
Frontend, on receiving this, silently re-fetches /v1/dashboard/me and re-renders nav/module visibility instantly — no logout/login needed, no stale UI.
11. Full REST API Reference
Base URL: https://api.testimonialapi.dev
All bodies JSON. All errors follow:

JSON

{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
11.1 Auth
Method	Path	Auth	Description
POST	/v1/auth/session	Firebase ID token	Exchange Firebase token for session cookies
POST	/v1/auth/refresh	refresh cookie	Rotate access/refresh tokens
POST	/v1/auth/logout	session	Invalidate current session
POST	/v1/auth/mfa/verify	session (partial)	Complete 2FA challenge
GET	/v1/dashboard/me	session	Current user + effective permissions + tenant/app context
11.2 Platform (Zojatech staff only, platform.* perms)
Method	Path	Perm	Description
GET	/v1/platform/tenants	tenants.view	List/search/paginate tenants
POST	/v1/platform/tenants	tenants.create	Create tenant + send owner invite
GET	/v1/platform/tenants/:id	tenants.view	Tenant detail
PATCH	/v1/platform/tenants/:id	tenants.manage	Update plan/status/branding override
POST	/v1/platform/tenants/:id/suspend	tenants.suspend	Suspend (disables all app keys)
POST	/v1/platform/tenants/:id/impersonate	tenants.impersonate	Issue short-lived support session (audited, banner shown)
DELETE	/v1/platform/tenants/:id	tenants.delete	Soft-delete (30-day purge window)
GET/POST	/v1/platform/staff	staff.manage	Manage Zojatech staff
POST	/v1/platform/invites	staff.invite	Create invite (platform or tenant scope)
GET/POST/PATCH	/v1/platform/templates	templates.manage	CRUD global templates
GET/POST/PATCH	/v1/platform/plans	plans.manage	CRUD plans + feature flags
GET/PATCH	/v1/platform/security/ip-rules	security.manage	Global IP allow/block
GET	/v1/platform/audit-logs	audit.view	Filterable audit trail
GET	/v1/platform/analytics/overview	tenants.view	Aggregate recharts data: growth, MRR, volume
11.3 Tenant Dashboard (tenant-scoped, tenant.* perms — tenantId inferred from session)
Method	Path	Perm	Description
GET	/v1/dashboard/tenant	—	Current tenant profile
PATCH	/v1/dashboard/tenant/branding	branding.manage	Logo, color, custom domain
GET/POST	/v1/dashboard/staff	staff.manage	List/invite tenant staff
PATCH/DELETE	/v1/dashboard/staff/:uid	staff.manage	Edit role/permissions, disable
GET/POST	/v1/dashboard/apps	apps.create/view	List/create Apps
GET	/v1/dashboard/apps/:appId	apps.manage	App detail incl. keys (secret masked)
PATCH	/v1/dashboard/apps/:appId	apps.manage	Update name/quotas(view)/security settings
PATCH	/v1/dashboard/apps/:appId/origins	apps.manage	Update allowedOrigins (runtime, instant)
POST	/v1/dashboard/apps/:appId/keys/rotate	apps.rotate_keys	Rotate pk/sk pair
DELETE	/v1/dashboard/apps/:appId	apps.manage	Archive app
GET	/v1/dashboard/apps/:appId/stats	testimonials.read	Recharts-ready aggregate data
GET/POST	/v1/dashboard/apps/:appId/testimonials	testimonials.read/write	List (filter/paginate) / manually create
PATCH	/v1/dashboard/apps/:appId/testimonials/:id	testimonials.write	Edit fields
POST	/v1/dashboard/apps/:appId/testimonials/:id/approve	testimonials.approve	Approve → status live
POST	/v1/dashboard/apps/:appId/testimonials/:id/reject	testimonials.approve	Reject w/ reason
DELETE	/v1/dashboard/apps/:appId/testimonials/:id	testimonials.delete	Soft delete
POST	/v1/dashboard/apps/:appId/testimonials/import-csv	testimonials.write	Bulk import
POST	/v1/dashboard/apps/:appId/testimonials/bulk-action	testimonials.approve	Bulk approve/reject/tag
GET/POST	/v1/dashboard/apps/:appId/forms	forms.manage	CRUD collection forms
GET	/v1/dashboard/apps/:appId/forms/:id/submissions	forms.manage	Raw submission log
GET/POST	/v1/dashboard/apps/:appId/widgets	widgets.manage	CRUD widgets
GET	/v1/dashboard/apps/:appId/widgets/:id/embed-code	widgets.manage	Returns script/iframe/react snippet
GET/POST	/v1/dashboard/apps/:appId/integrations	integrations.manage	Connect/list integrations
DELETE	/v1/dashboard/apps/:appId/integrations/:provider	integrations.manage	Disconnect
POST	/v1/dashboard/apps/:appId/integrations/twitter/sync-now	integrations.manage	Manual trigger
GET/POST	/v1/dashboard/apps/:appId/webhooks	webhooks.manage	CRUD outbound webhooks
GET	/v1/dashboard/apps/:appId/webhooks/:id/deliveries	webhooks.manage	Delivery log + retry button
GET	/v1/dashboard/templates	—	Browse available (plan-gated) templates
GET	/v1/dashboard/billing	billing.view	Plan, usage, invoices
POST	/v1/dashboard/billing/upgrade	billing.manage	Stripe checkout session
11.4 Public/App API (/v1/public/*, key-authenticated, used by widgets/SDKs/tenant backends)
Method	Path	Key type	Description
GET	/v1/public/testimonials	pk or sk	List approved testimonials, filterable by tags/rating/limit (pk restricted to status=approved always; sk can pass status freely)
GET	/v1/public/testimonials/:id	pk or sk	Single testimonial
POST	/v1/public/testimonials	sk only	Programmatically submit a testimonial (enters pending)
PATCH	/v1/public/testimonials/:id	sk only	Update
DELETE	/v1/public/testimonials/:id	sk only	Delete
POST	/v1/public/testimonials/:id/approve	sk only	Approve via API
GET	/v1/public/widgets/:widgetId	pk	Returns rendered widget config + testimonial data (used by widget.js)
POST	/v1/public/forms/:formSlug/submit	pk (embedded in form)	Public testimonial submission from end-customers, hCaptcha-verified
GET	/v1/public/forms/:formSlug	pk	Form schema for rendering
11.5 Webhooks — Inbound (third-party → us)
Path	Purpose
/v1/webhooks/twitter	OAuth callback + mention notifications
/v1/webhooks/stripe	Billing events
/v1/webhooks/zapier/:appId	Generic inbound trigger from Zapier "Action"
11.6 Standard error codes
text

UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR,
RATE_LIMITED, QUOTA_EXCEEDED, ORIGIN_NOT_ALLOWED,
KEY_REVOKED, PLAN_FEATURE_LOCKED, TENANT_SUSPENDED, CONFLICT
All are mapped to correct HTTP status (401/403/404/422/429/403/403/401/402/423/409 respectively).

12. Rate Limiting Specification
Redis token-bucket per key, per IP fallback for unauthenticated public reads.

Plan	Public reads/min	Writes/min	Burst
Free	60	10	20
Starter	300	60	100
Pro	1200	300	400
Enterprise	custom (config-driven)	custom	custom
Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. 429 includes Retry-After.

13. Realtime System
13.1 Transport
Socket.IO namespace /live, authenticated at handshake using the same session JWT (public-key API consumers never connect here — this is dashboard-only).

13.2 Channel model
text

user:{uid}                → personal notifications, permission changes
tenant:{tenantId}         → branding updates, plan changes, staff list changes
app:{appId}               → new testimonial arrived, moderation queue count, widget published
Client subscribes only to channels it's authorized for; server validates on every join event against current permissions.

13.3 Sample events
text

permissions_changed        → { uid }
testimonial.new_pending    → { appId, testimonialId }  (badge count update)
branding.updated           → { tenantId, logoUrl, brandColor }
key.rotated                → { appId }
tenant.suspended           → { tenantId }
13.4 Kill-switch
Platform Admin "force logout" or "disable staff" triggers session.revoked on user:{uid} channel → frontend immediately redirects to /login and clears local state, giving true real-time revocation rather than waiting for token expiry.

14. Template Engine (Widgets & Forms)
14.1 Design goals
Beautiful defaults, safe customization, no ability for a tenant to inject arbitrary script into the widget runtime (XSS risk) — customization is limited to the declared configSchema (colors, toggles, numbers, fonts, layout variant), never raw HTML/CSS/JS injection in the standard tier. (An "Advanced/Custom CSS" field can be offered on Enterprise plan, sanitized through a strict CSS parser.)

14.2 Widget template catalogue (v1 launch set)
Carousel — auto-playing horizontal slider, avatar + name + stars + quote.
Grid / Wall of Love — Pinterest-style masonry of cards, infinite scroll.
Spotlight — single large centered testimonial, great for landing page hero.
Video Wall — grid of video-testimonial thumbnails with lightbox playback.
Floating Badge — small corner popup, rotates testimonials, dismissible.
Inline Quote Strip — minimal single-line marquee, logos + quote, for navbars/footers.
14.3 Form template catalogue (v1 launch set)
Simple Star + Text — 1-step, rating + textarea.
Multi-step Wizard — rating → text → photo/video upload → contact info.
Tweet-style Card — short-form, live preview of how it'll look as a card.
Video-first — prompts for a short video upload with guiding questions.
14.4 Rendering pipeline
text

1. Tenant creates Widget: picks templateId + sets filter + styleOverrides.
2. widget.js (CDN, ~15kb gzipped) loads on the tenant's site:
   <script src=".../widget.js" data-widget="wg_xxx" data-app="app_xxx"></script>
3. Script calls GET /v1/public/widgets/:widgetId with pk key (read from data attribute
   or global config) → server merges template + config + live filtered testimonials.
4. Response is a JSON payload; widget.js mounts a Shadow DOM Web Component
   (style-isolated from host page) and renders using a small internal
   template-registry matching componentRef.
5. For React consumers: @testimonial-api/react ships the same components
   natively, calling the same /v1/public/widgets/:widgetId endpoint via
   useWidget(widgetId) hook — no double implementation, one design source.
14.5 Template versioning
Templates carry a version field; Widgets pin to a version at creation and can opt-in to "auto-update to latest" or stay locked — prevents a platform-side design change from silently breaking a tenant's live site.

15. Testimonial Lifecycle & Moderation
text

        ┌─────────┐
 create │ pending │──approve──▶ approved ──(shown in widgets)
        └─────────┘
             │
          reject
             ▼
        ┌─────────┐
        │ rejected │ (kept for audit, never shown)
        └─────────┘

 approved/rejected/pending ──archive──▶ archived (hidden, retained)
Manual entry by staff → default status: pending unless staff has testimonials.approve and one-click-approves at creation.
Form submission → always pending, optional auto-notify Slack/email on arrival.
API (sk) submission → pending by default; tenant backend can immediately call .approve() if they trust their own upstream validation (e.g., already-verified NPS survey data).
Social import (AI) → always pending, flagged with confidence score, never auto-published — hard rule, no override, to prevent reputational/spam risk.
Every transition writes an auditLogs entry and triggers relevant webhook.
16. Collection Forms Module
Each form gets a public URL: https://forms.testimonialapi.dev/{tenantSlug}/{formSlug}, plus an embeddable <iframe>/modal-trigger snippet, plus a QR code (auto-generated, downloadable PNG/SVG) for in-person/print use (e.g., "scan to leave a review" table tent).
Submission pipeline: client-side validation → hCaptcha → POST /v1/public/forms/:slug/submit → server-side validation + honeypot check + rate limit by IP → media (if any) uploaded via signed GCS URL obtained first (POST /v1/public/forms/:slug/upload-url) so large files never transit the API server → testimonial created as pending → tenant notified.
Consent checkbox is mandatory by default (configurable) and stored (content.consentGiven: true, consentTimestamp) for legal defensibility of public display.
17. Automation & Integrations
17.1 Social import (Twitter/X example)
text

Worker cron (per app, per configured frequency):
1. Query Twitter API v2 recent-search for handle/keyword set.
2. For each result not already fingerprinted:
   a. Run through LLM classification prompt:
      "Is this a genuine positive customer testimonial about {brand}? 
       Extract: sentiment_score(1-5), cleaned_quote, is_spam(bool)."
   b. If is_spam=true or sentiment_score < configurable threshold → discard.
   c. Else → create testimonial: source='twitter_import', status='pending',
      content.rating = sentiment_score, sourceRef = tweetId.
3. Update integrations/{id}.lastSyncAt.
4. Emit `app:{appId}` realtime event → dashboard pending-count badge updates live.
Human must always click Approve — enforced server-side regardless of any dashboard toggle, described in docs as a permanent trust/safety guarantee.

17.2 CSV import
Upload → server-side streaming parse → column-mapping UI step → dedupe via fingerprint → bulk insert as pending.

17.3 Outbound Webhooks
Events: testimonial.created, testimonial.approved, testimonial.rejected, form.submitted, import.completed, quota.threshold_reached.
Delivery: HMAC-SHA256 signature in X-TestimonialAPI-Signature header (t=timestamp,v1=hash), 5 retry attempts with exponential backoff (1m, 5m, 30m, 2h, 12h), full delivery log with manual "Resend" button in dashboard — modeled directly on Stripe's webhook UX.

17.4 Zapier / Make.com
Published Zapier app exposing Triggers (New Testimonial, New Pending Import) and Actions (Create Testimonial, Approve Testimonial) — built on top of the same public API + a dedicated sk-scoped Zapier OAuth-like connection flow.

18. SDKs & Developer Tooling
18.1 @testimonial-api/node (server SDK, uses sk_)
TypeScript

import { TestimonialAPI } from '@testimonial-api/node';
const client = new TestimonialAPI({ secretKey: process.env.TESTIMONIAL_SK });

await client.testimonials.list({ status: 'approved', limit: 10 });
await client.testimonials.create({ author: {...}, content: {...} });
await client.testimonials.approve(id);
await client.widgets.getConfig(widgetId);
await client.webhooks.verifySignature(payload, signatureHeader, secret);
18.2 @testimonial-api/react (browser SDK, uses pk_)
React

import { TestimonialWall, TestimonialCarousel, CollectionForm, useTestimonials } from '@testimonial-api/react';

<TestimonialCarousel appId="app_xxx" publicKey="pk_live_xxx" widgetId="wg_xxx" />

const { data, loading } = useTestimonials({ appId, publicKey, tags: ['pricing'] });
18.3 @testimonial-api/widget (vanilla, powers the <script> tag)
Same rendering engine as the React package, compiled to a framework-agnostic Web Component — usable in WordPress, Webflow, Shopify Liquid, plain HTML.

18.4 @testimonial-api/cli
text

testimonial-api login
testimonial-api apps:create "Marketing Site"
testimonial-api keys:rotate --app app_xxx
testimonial-api webhooks:listen        # local tunnel for dev testing, like `stripe listen`
18.5 OpenAPI & Postman
Full OpenAPI 3.1 spec auto-generated from NestJS decorators; published Postman collection with pre-filled environment variables for sk_test_ sandbox usage.

19. Developer Portal Structure (docs.testimonialapi.dev)
text

/getting-started        (concepts, quickstart in curl + Node + React)
/authentication         (pk vs sk, environments, security best practices)
/api-reference           (auto-generated, per-module)
/widgets                 (per template: props, screenshots, code)
/forms                   (building & embedding collection forms)
/webhooks                (event catalogue, signature verification)
/sdks                    (node, react, cli — install + full method docs)
/integrations             (twitter, zapier, slack setup guides)
/guides                  ("Add testimonials to WordPress", "Next.js", "Webflow", ...)
/changelog
/status                  (link to uptime/status page)
20. No-Code Tooling for Tenants
Visual Widget Builder: template gallery → live drag-free config panel (bound to configSchema) → real-time preview iframe → "Publish" → auto-generated embed code (script/iframe) shown with copy button and platform-specific tabs (WordPress, Webflow, Shopify, plain HTML, React).
Visual Form Builder: same pattern for Collection Forms, plus a shareable direct link and downloadable QR code — zero technical knowledge required.
One-click platform installers (phase 2): WordPress plugin, Shopify app, Webflow custom code snippet generator — all just thin wrappers around the same script embed, submitted to each platform's app store for one-click install.
21. Platform Dashboard — Full Page Inventory
Page	Contents
Overview	Recharts: tenant growth (line), MRR (area), testimonials volume across platform (bar), system health widget, recent audit events feed
Tenants	Searchable/filterable table, status badges, quick actions (suspend/impersonate), "Create Tenant" modal (name, owner email → sends invite)
Tenant Detail	Tabs: Overview, Apps, Staff, Billing, Audit Log, Danger Zone (suspend/delete)
Staff (Platform)	Table + invite flow, role editor with live permission checkboxes
Templates	Grid of Widget/Form templates, create/edit config schema, mark premium, version history
Plans & Flags	Plan editor (quotas, price, feature toggle matrix)
Security Center	Global IP rules, default rate limits per plan, active sessions monitor
Audit Logs	Global filterable log (actor, action, tenant, date range), export CSV
Billing (platform revenue)	Stripe-connected MRR/churn overview
Settings	Platform branding (for emails/docs), API status page config
22. Tenant Dashboard — Full Page Inventory
Page	Contents
Overview	Recharts: testimonials over time, source breakdown (pie), rating distribution (bar), pending-approval count card w/ CTA
Apps	Card grid per App; click-in reveals Keys tab (pk/sk with reveal/rotate), Origins tab (add/remove, live), Quotas (read-only, plan-based)
Testimonials	Table + Kanban toggle (Pending / Approved / Rejected / Archived columns), bulk select actions, detail drawer with edit form, "Add Manually" button, "Import CSV" button
Collection Forms	List + builder (template picker → config → preview → publish), submissions log per form
Widgets	List + builder (template picker → live preview → style panel → embed code modal with framework tabs)
Integrations	Cards per provider (Twitter, Zapier, Slack, Webhooks) with connect/configure/sync-now/disconnect
Webhooks	Endpoint list, event subscription checkboxes, delivery log with retry
Team	Staff table, invite modal, role/permission editor
Branding	Logo upload, accent color picker, custom domain setup (with DNS verification instructions)
Billing	Current plan, usage bars (testimonials/mo, apps, seats), upgrade CTA, invoice history
Settings	Tenant name/slug, danger zone (delete app/tenant data export)
Both dashboards share one Next.js shell app with route groups (/platform/* vs /t/[tenantId]/*), one design system package, differing only by which nav items + pages are compiled into the bundle the logged-in role can reach (guarded both client-side for UX and, critically, server-side on every API call).

23. Design System Guidelines
Palette: neutral slate/gray base (slate-50 → slate-900), single dynamic accent (--brand-color, defaults #4F46E5) driven per-tenant from tenants/{id}.brandColor, injected as a CSS variable at shell root.
Typography: Inter (UI), optional per-template font swap for public-facing widgets only.
Components: shadcn/ui primitives (Button, Card, Dialog, Sheet, Table, Tabs, DropdownMenu, Toast) — consistent 8px spacing scale, rounded-xl cards, soft shadow-sm.
Motion: Framer Motion limited to page-transition fades, drawer slides, and badge count pulse — never gratuitous.
Charts: Recharts with a shared <ChartCard title subtitle> wrapper for visual consistency; consistent tooltip style, gridlines minimal/light.
Dark mode: class-based (next-themes), fully supported across both dashboards.
Empty/loading/error states: standardized components (<EmptyState icon title description action/>, skeleton loaders) required on every list view — non-negotiable in the component library to keep it "not shabby."
24. Notification System
Channel	Triggers
Email (transactional)	invite sent, invite accepted, new pending testimonial digest (daily/instant, configurable), quota threshold (80%/100%), key rotated, payment failed
In-app (bell icon, realtime)	new pending testimonial, staff role changed, integration sync failed
Webhook (outbound)	all testimonial/import/quota events (§17.3)
Slack (via integration)	new testimonial approved/pending, sync failures
25. Billing & Plans
Plan	Price (example)	Apps	Testimonials/mo	Seats	Features
Free	$0	1	50	1	Manual + form, 2 widget templates, Testimonial API branding on widgets
Starter	$29/mo	3	500	5	All templates, CSV import, webhooks
Pro	$99/mo	10	5,000	15	AI social import, custom domain, remove branding, priority support
Enterprise	custom	unlimited	custom	unlimited	SSO/SAML, custom rate limits, SLA, dedicated support
Stripe handles subscription billing; tenants/{id}.billing.stripeCustomerId links records; webhook /v1/webhooks/stripe keeps plan/status in sync; usage metering (usage.testimonialsThisMonth) reset via scheduled Cloud Function on billing cycle rollover, enforced pre-write in the API (QUOTA_EXCEEDED at limit, soft-warn at 80% via notification).

26. Onboarding & Invite Flows (detailed)
26.1 Platform → Tenant onboarding
text

1. Platform Admin: POST /v1/platform/tenants {name, ownerEmail}
2. System creates tenants/{id} (status: pending_setup) + invites/{token}
   (scope: tenant, role: owner, expiresAt: now+72h)
3. Email sent to ownerEmail: "You've been invited to set up {name} on
   Testimonial API" → link: app.testimonialapi.dev/onboard/{token}
4. Recipient opens link → token validated (not expired/used/revoked)
   → sets password (or Google SSO) → Firebase Auth account created
   → backend creates tenants/{id}/staff/{uid} role=owner, status=active
   → invites/{token}.usedAt set, tenant.status → active
5. Owner lands directly in a guided first-run checklist:
   "Create your first App" → "Create your first Widget" →
   "Copy your embed code" → "Invite your team"
26.2 Tenant → Staff invite
Identical mechanism, scope: tenant, tenantId set, restricted to roles the inviter itself is permitted to grant (an editor cannot invite an owner).

26.3 Revocation
Any unused invite can be revoked (revoked: true) instantly from the dashboard, killing the link before use.

27. Security Architecture (comprehensive)
Transport: TLS 1.2+ enforced everywhere, HSTS preload.
Headers: Helmet defaults + strict CSP for dashboards (widget runtime intentionally loads cross-origin, scoped separately), X-Frame-Options, Referrer-Policy: strict-origin-when-cross-origin.
Input validation: class-validator DTOs / zod schemas on every endpoint; reject unknown fields (whitelist: true, forbidNonWhitelisted: true).
Output encoding: testimonial message sanitized (DOMPurify server-side) before storage AND escaped again at render — defense in depth against stored XSS via user-submitted content.
File uploads: signed short-lived GCS URLs only; MIME/type/size validated both client and server side; images re-encoded via Cloud Function (strip EXIF/metadata, resize) before being marked usable.
Secrets: OAuth tokens (Twitter etc.) and webhook secrets stored via envelope encryption (Google Cloud KMS) — never plaintext at rest.
Password/key hashing: argon2id for secret API keys and any local password fallback.
CAPTCHA: hCaptcha on all public, unauthenticated submission endpoints (collection forms).
Bot/spam: honeypot fields + fingerprint dedupe + IP-based submission rate limiting on public forms.
Least privilege: backend service account for Firestore/GCS/KMS scoped to exactly the resources needed, separate service accounts for api vs worker.
Dependency hygiene: automated npm audit/Snyk in CI, Dependabot enabled.
Pen-testing / OWASP: annual third-party pentest recommended pre-enterprise-sales; OWASP ASVS Level 2 as the internal bar.
Data isolation: every Firestore query in code is required (via lint rule / code review checklist) to include a tenantId/appId scoping clause — no "global" query helper exists that could accidentally leak cross-tenant data.
Impersonation safety: platform "impersonate tenant" sessions are time-boxed (15 min), watermark-banner shown ("Viewing as support — actions are logged"), and every action taken during impersonation is tagged actorType: platform_admin, onBehalfOf: tenantId in audit logs.
28. Infrastructure & Environments
Environment	Purpose	Notes
local	developer machines	Firebase emulator suite (Auth+Firestore), local Redis via Docker
staging	pre-prod QA, sandbox keys only	mirrors prod topology, seeded demo tenant
production	live	blue/green deploys via Cloud Run revisions, gradual traffic shift
CI/CD (GitHub Actions):

text

on PR:        lint → typecheck → unit tests → build
on merge main: build containers → push to Artifact Registry →
               deploy to staging → run e2e (Playwright) →
               manual approval gate → deploy to production (canary 10% → 100%)
Infra as code via Terraform (Cloud Run services, Redis instance, GCS buckets, IAM, Secret Manager entries) — fully reproducible environment stand-up.

29. Observability
Logging: structured JSON logs (pino) → Cloud Logging, correlation ID per request threaded through to worker jobs.
Error tracking: Sentry on both backend and frontends, source-mapped.
Metrics/dashboards: Cloud Monitoring dashboards for request latency, error rate, Redis hit ratio, queue depth, webhook delivery success rate.
Alerting: PagerDuty/Slack alerts on 5xx rate spike, queue backlog, quota-service errors, failed Stripe webhook signature checks.
Status page: public status.testimonialapi.dev (e.g., via Better Uptime) tracking API, Widget CDN, Dashboard uptime independently.
30. Testing Strategy
Layer	Tooling	Coverage target
Unit	Jest	services, guards, permission resolution logic — 80%+
Integration	Jest + Firebase Emulator	full request→Firestore round trips per module
E2E (API)	Supertest / Postman/Newman	critical flows: onboarding, key rotation, testimonial lifecycle
E2E (UI)	Playwright	login, create app, create widget, approve testimonial, embed renders
Load	k6	public API endpoints under plan-tier rate limits
Security	OWASP ZAP baseline scan in CI	pre-release gate
31. Compliance & Data Privacy
GDPR-style data subject rights: testimonial authors can request removal — tenant-facing "Delete on request" action, plus a platform-level data subject request handler for direct requests to Zojatech.
Data export: tenant can export all their data (testimonials, forms, widgets config) as JSON/CSV at any time (/v1/dashboard/export).
Data retention: soft-deleted tenants purged after 30 days; audit logs retained 12 months minimum (configurable per compliance needs); rejected testimonials retained but never exposed publicly.
Consent: collection forms require explicit consent checkbox by default before public display is permitted.
PII minimization: author email is stored but never returned by any /v1/public/* endpoint, only visible in tenant dashboard.
32. Disaster Recovery
Firestore automated daily export to GCS (via Cloud Scheduler + export API), 30-day retention, monthly restore-drill.
Redis is cache/ephemeral-only — safe to lose, rebuilt from Firestore on cold start (no source-of-truth data lives only in Redis).
Multi-region GCS bucket for media.
RPO target: 24h (or near-zero with Firestore's built-in point-in-time recovery feature if enabled). RTO target: <2h for full service restoration.
33. Versioning Strategy
API: URL-versioned (/v1/...); breaking changes ship as /v2 with a documented deprecation window (minimum 6 months) for /v1.
Templates: semantic version per template; widgets pin a version, opt-in upgrade.
SDKs: SemVer, published to npm under @testimonial-api/* scope, changelogs auto-generated via Changesets.
34. Phased Delivery Roadmap
Phase 1 — MVP (foundation)
Auth + RBAC (both levels), Tenant/App CRUD, manual testimonial CRUD + moderation, 3 widget templates + vanilla embed script, basic dashboard shell w/ Recharts overview, invite flow, runtime-managed origins, API key issuance.

Phase 2 — Collection & Integrations
Collection Forms (2 templates), CSV import, outbound webhooks, @testimonial-api/node + @testimonial-api/react, developer docs portal v1.

Phase 3 — Automation & Polish
Twitter/X AI import pipeline, no-code widget/form builder UX polish, custom domains, dark mode, Slack/Zapier integrations, CLI tool.

Phase 4 — Monetization & Scale
Stripe billing/plans, usage metering + quota enforcement, impersonation tooling, BigQuery analytics export, SSO/SAML for Enterprise, WordPress/Shopify one-click apps, pentest + SOC2-readiness pass.

35. Appendix — Sample Payloads
Create testimonial (server SDK / sk)

JSON

POST /v1/public/testimonials
{
  "author": { "name": "Ada Obi", "title": "CTO", "company": "Flux Inc", "avatarUrl": null },
  "content": { "message": "This tool saved us weeks.", "rating": 5, "ratingType": "star5" },
  "tags": ["onboarding"]
}
Widget config response

JSON

GET /v1/public/widgets/wg_293
{
  "widget": { "layoutType": "carousel", "styleOverrides": { "primaryColor": "#4F46E5" } },
  "template": { "componentRef": "CarouselV1", "version": 3 },
  "testimonials": [ { "author": {...}, "content": {...} } ]
}
Webhook delivery payload

JSON

{
  "event": "testimonial.approved",
  "appId": "app_7c1e9b",
  "data": { "testimonialId": "tst_88a1", "rating": 5 },
  "timestamp": "2025-01-01T12:00:00Z"
}
This document is intended as the single source of truth for engineering, design, and QA to build Testimonial API end-to-end. It is deliberately name-generic (no Zojatech/iThorizons-specific branding baked into the architecture) so the entire system — schema, API, dashboards, SDKs — can be white-labeled and resold as-is for future clients beyond this engagement.



this needs thorough research and business minded ness no unnecessary gradients or coloring we need clean layout understandable and VERY USER FIENDLY



