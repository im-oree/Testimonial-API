# DOC 1 — THE SKELETON
## Architecture, Domain Model & Database Design

> Canonical engineering source for the Doc-1 scope. This document is **implemented in this repository** — every section below corresponds to real, buildable code. See §12 "Implementation Map" at the end for where each section lives in the repo, and the companion `docs/00-roadmap.md` for the series context. Product-level reference: `README.md` (v1.0 master spec).

---

## 1. Foundational Rule: Database-Agnostic by Design

**Firebase/Firestore is a prototyping database only. PostgreSQL is the production database.** The entire backend must be written so that **swapping the storage engine requires touching zero business logic** — only swapping which adapter is bound in the dependency injection container.

This is achieved with **Hexagonal Architecture (Ports & Adapters)**.

```
┌──────────────────────────────────────────────────────────┐
│                     CONTROLLERS (HTTP)                     │
│         (NestJS controllers — never know about DB)         │
└───────────────────────────┬──────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    SERVICES (Business Logic)                │
│   TenantService, AppService, TestimonialService, etc.       │
│   — depend ONLY on repository INTERFACES (ports), never     │
│     on Firestore or SQL directly                             │
└───────────────────────────┬──────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│               REPOSITORY INTERFACES ("PORTS")               │
│   ITenantRepository, IAppRepository, ITestimonialRepository │
│   (pure TypeScript interfaces — zero implementation)         │
└───────────┬───────────────────────────────┬────────────────┘
            ▼                               ▼
┌───────────────────────┐      ┌───────────────────────────┐
│  FirestoreAdapter       │      │   PostgresAdapter           │
│  (implements interfaces │      │   (implements same           │
│   using Firebase Admin  │      │    interfaces using Prisma)  │
│   SDK) — TEST/PROTOTYPE │      │   — PRODUCTION                │
└───────────────────────┘      └───────────────────────────┘
```

**The rule enforced across the whole codebase:** no file outside `/infrastructure/database/*` is ever allowed to import `firebase-admin` or `@prisma/client` directly. This is enforced with a dedicated ESLint rule (`eslint-plugin-repo-boundaries`, see §11), checked in CI — a PR that violates it fails the build automatically.

### 1.1 How "one tap to SQL" actually works

A single environment variable controls everything:

```env
DATABASE_PROVIDER=firebase    # during prototyping/validation phase
DATABASE_PROVIDER=postgres    # production, or once validated
```

At application bootstrap, a **Provider Factory** reads this variable and registers the correct concrete class against each interface token in NestJS's DI container (`apps/api/src/infrastructure/database/database.module.ts` + `provider.factory.ts`). Every service injects the **interface**, never the class:

```typescript
@Injectable()
export class TenantService {
  constructor(
    @Inject('ITenantRepository') private readonly tenantRepo: ITenantRepository,
  ) {}
}
```

**Result:** to go from prototype to production, you change one environment variable, run the SQL migration to create tables (already written and version-controlled from day one — see §6), run the one-time data migration script (§9), and redeploy. Zero lines of business logic touched. Zero controller touched. Zero frontend touched (frontend never knew which DB was behind the API anyway).

### 1.2 Why this matters for your team

- Junior devs can build/test features fast against Firebase locally (no local Postgres setup needed) while the production adapter is developed in parallel.
- You can even run **both adapters in CI** against the same test suite (`describe.each(['firestore','postgres'])`) to prove behavioral parity before cutover.
- Reusability: since the domain layer has zero DB-specific code, this entire codebase is trivially white-labeled/resold for other clients (as you wanted), regardless of what database they eventually prefer.

---

## 2. Monorepo Folder Structure (full skeleton, every file placed)

Using **Turborepo** with **NestJS** (backend) and **Next.js** (frontends).

> **Implementation note:** the tree below is the target. Folders marked `⚙️ implemented` are fully built in this first pass (per the Doc-1 scope); folders marked `📦 scaffolded` exist as buildable shells whose full contents land in the doc that owns them (frontends → Docs 4–5, SDKs/CLI → Doc 3, docs site → Doc 3, widget-runtime → Doc 3, worker processors → Doc 2). Details per folder in the "Implementation Map" (§12).

```
testimonial-api/
├── apps/
│   ├── api/                                 # Main backend service ⚙️
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   │
│   │   │   ├── infrastructure/              # ALL storage-specific code lives here ONLY ⚙️
│   │   │   │   ├── database/
│   │   │   │   │   ├── database.module.ts
│   │   │   │   │   ├── provider.factory.ts
│   │   │   │   │   ├── firestore/
│   │   │   │   │   │   ├── firestore.client.ts
│   │   │   │   │   │   ├── mappers/
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   └── postgres/
│   │   │   │   │       ├── prisma.client.ts
│   │   │   │   │       ├── schema.prisma
│   │   │   │   │       ├── migrations/
│   │   │   │   │       ├── mappers/
│   │   │   │   │       └── repositories/
│   │   │   │   ├── cache/
│   │   │   │   ├── storage/
│   │   │   │   ├── queue/
│   │   │   │   └── email/
│   │   │   │
│   │   │   ├── domain/                      # (re-export of packages/domain) ⚙️
│   │   │   ├── modules/                     # Feature modules ⚙️
│   │   │   │   ├── auth/  platform/  tenants/  apps/
│   │   │   │   ├── testimonials/  forms/  widgets/  templates/
│   │   │   │   ├── integrations/  webhooks/  billing/  realtime/
│   │   │   │   ├── audit/  notifications/
│   │   │   ├── common/                      # DTOs, pipes, guards-agnostic utils ⚙️
│   │   │   └── config/                      # env validation + runtime config ⚙️
│   │   ├── test/  Dockerfile  package.json  .env.example
│   │
│   ├── worker/                              # Async job processor 📦 (processors ⚙️ in Doc 2)
│   ├── platform-dashboard/  tenant-dashboard/  public-forms/   # Next.js 📦 (Docs 4–5)
│   ├── docs/                                # Documentation site 📦 (Doc 3)
│   └── widget-runtime/                      # Vanilla embeddable widget.js 📦 (Docs 3–4)
│
├── packages/
│   ├── domain/                              # ⚙️ entities + repository interfaces + errors/VOs/utils
│   ├── shared-types/                        # ⚙️ DTO/enum/zod/rbac shared FE+BE
│   ├── ui/                                  # 📦 design system library (Doc 5)
│   ├── sdk-node/  sdk-react/  cli/          # 📦 (Doc 3)
│   └── config/                              # ⚙️ shared eslint/tsconfig/tailwind configs + eslint-plugin-repo-boundaries
│
├── infra/
│   ├── terraform/                           # 📦 (Doc 6)
│   ├── postgres/
│   │   ├── schema.sql                       # ⚙️ canonical, hand-reviewable full schema
│   │   └── seed.sql                         # ⚙️ dev/demo seed
│   └── firestore/
│       ├── firestore.rules                  # ⚙️
│       └── firestore.indexes.json           # ⚙️
│
├── scripts/                                 # ⚙️ Firebase → Postgres migration tooling (§9)
├── turbo.json
├── package.json
└── README.md
```

**Key skeleton rule:** `packages/domain` is the single shared source of entities and repository interfaces — imported by both `apps/api` and `apps/worker`, so there is never a second, drifted copy of "what a Testimonial looks like."

---

## 3. Domain Entities (pure, storage-agnostic TypeScript)

These live in `packages/domain/entities/*` and contain **zero decorators, zero Firestore types, zero Prisma types** — just plain interfaces/classes. This is what guarantees the swap works. Implemented 1:1 (see §12), including the Doc-1 additions not present in the README v1.0 model: a centralized **`User`** entity/`users` table (identity) and the **`FormQuestion`** entity.

The full set: `User`, `PlatformAdmin`, `Tenant`, `TenantStaff`, `App`, `ApiKey`, `Testimonial`, `CollectionForm`, `FormQuestion`, `Widget`, `Template`, `Integration`, `WebhookEndpoint`, `WebhookDelivery`, `Invite`, `AuditLog`, `Plan`, plus the denormalized `AppStats` read-model consumed by dashboards (billing/worker-owned).

---

## 4. Repository Interfaces (the Ports)

Every entity gets one interface in `packages/domain/repositories/*.interface.ts`:
`IUserRepository`, `IPlatformAdminRepository`, `ITenantRepository`, `ITenantStaffRepository`, `IAppRepository`, `IApiKeyRepository`, `ITestimonialRepository`, `ICollectionFormRepository`, `IWidgetRepository`, `ITemplateRepository`, `IIntegrationRepository`, `IWebhookEndpointRepository`, `IWebhookDeliveryRepository`, `IInviteRepository`, `IAuditLogRepository`, `IPlanRepository`, `IAppStatsRepository`.

Each exposes `findById / findMany(filters, pagination) / create / update` (plus entity-specific lookups such as `findBySlug`, `findByFingerprint`, `bulkUpdateStatus`, `touchLastUsed`) and returns domain entities only — never rows/documents. Pagination & filter shapes live in `packages/domain/repositories/common.types.ts`.

---

## 5. Adapter Implementation Pattern (both sides)

The Firestore adapter is implemented in
`apps/api/src/infrastructure/database/firestore/repositories/*` (+ `mappers/*`),
and the Postgres adapter (via Prisma) in
`apps/api/src/infrastructure/database/postgres/repositories/*` (+ `mappers/*`).

A shared **generic base repository** per engine (`firestore/firestore-base.repository.ts`, `postgres/postgres-base.repository.ts`) implements the mechanical `findById / create / update / paginated findMany` plumbing once; each concrete repository adds its entity-specific queries and delegates persistence translation to its **mapper**. The mapper layer means column renames, type changes, or even splitting one table into two in Postgres later never leaks into business logic — only the mapper changes.

> **Implementation note vs. §5 code sample:** the skeleton example in the original Doc 1 text used Firestore subcollections (`apps/{id}/testimonials`). §7 of this same document mandates **flattened top-level collections**, which is what the code implements — the §5 sample was illustrative pseudocode.

---

## 6. Production SQL Schema (PostgreSQL — full DDL)

Canonical, reviewable schema in `infra/postgres/schema.sql` — source-controlled from day one even while running on Firestore, so the target is never a guess. The Prisma schema (`apps/api/src/infrastructure/database/postgres/schema.prisma`) mirrors it 1:1 (snake_case columns ↔ camelCase domain via mappers).

**Relational design decisions (recap):**
- **`api_keys` is a separate table**, not columns on `apps` — full rotation history/audit trail.
- **`form_questions` and `testimonials` are normalized**, not JSON blobs — independent indexing/filtering/pagination at scale.
- **`custom_fields`, `style_overrides`, `config_schema`, `features`** remain `JSONB` — genuinely schema-flexible data stays flexible.
- **`audit_logs` is partitioned by month** from day one.
- Every FK has an explicit `ON DELETE` behavior (`CASCADE` for owned children, `SET NULL` for historical references).

---

## 7. Firestore Prototype Schema (mirrors the SQL model exactly)

Flattened top-level collections with denormalized foreign keys — deliberately **no deep nesting**, because deep nesting is exactly what makes a later SQL migration painful. Every Firestore document carries the same (camelCase) field names as the SQL columns map to, so the migration script (§9) is closer to a 1:1 copy than a redesign. Required composite indexes are declared in `infra/firestore/firestore.indexes.json`.

Collections: `users, platformAdmins, plans, tenants, tenantStaff, apps, apiKeys, testimonials, templates, collectionForms, formQuestions, widgets, integrations, webhookEndpoints, webhookDeliveries, invites, auditLogs, appStats`.

---

## 8. ID Generation Strategy

- **Internal primary keys**: UUID v4 everywhere (`gen_random_uuid()` in Postgres; `crypto.randomUUID()` generated app-side for Firestore doc IDs so both adapters produce the *same kind* of ID).
- **Public-facing IDs** (`App.publicId`, API keys, optional testimonial short-ref): human-legible prefixed IDs via `packages/domain/utils/id-generator.ts` (`generatePublicId('app') → app_7c1e9b4a2f0d`). Shared, DB-agnostic, used identically by both adapters.

---

## 9. Migration Strategy: Firebase → SQL ("the one tap")

Concrete runbook implemented in `scripts/`:

```
Step 0 (ongoing during prototype phase): schema.sql + Postgres adapters live from day one;
     CI runs the SAME test suite against both adapters.
Step 1 — Freeze: tenant-facing writes into brief maintenance mode (or low-traffic window).
Step 2 — Export:   scripts/export-firestore.ts   → streams every collection to NDJSON in GCS
                    using the SAME domain mappers the app uses.
Step 3 — Transform & Load: scripts/migrate-to-postgres.ts → reads NDJSON, uses domain entities
                    as the intermediate representation, inserts in dependency order
                    (users → tenants → apps → api_keys → testimonials → ...), reusing UUIDs.
Step 4 — Verify:    scripts/verify-migration.ts  → row counts, field-by-field spot checks,
                    aggregate-stat diffs (total, avg rating).
Step 5 — Cutover:   change DATABASE_PROVIDER=postgres, redeploy api + worker (zero code
                    changes), smoke-test, remove maintenance banner.
Step 6 — Decommission: Firestore kept read-only 30 days as rollback net, final export
                    archived to cold storage, then Firestore deleted.
```

Because both adapters were built against the same interfaces and tested with the same test suite throughout, this migration is a data-movement exercise only — **not a rewrite**.

---

## 10. Module-to-Table Ownership Map

| Module | Owns tables |
|---|---|
| `auth` | `users` |
| `platform` | `platform_admins`, `plans` |
| `tenants` | `tenants`, `tenant_staff` |
| `apps` | `apps`, `api_keys` |
| `testimonials` | `testimonials` |
| `forms` | `collection_forms`, `form_questions` |
| `widgets` | `widgets` |
| `templates` | `templates` |
| `integrations` | `integrations` |
| `webhooks` | `webhook_endpoints`, `webhook_deliveries` |
| `audit` | `audit_logs` |
| (shared, invite flow) | `invites` |
| `billing`/worker | `app_stats` (write), reads `tenants.plan` |

Modules only touch their own repositories; cross-module needs go through the other module's *service*, never its repository. Because repositories are only reachable through interface tokens provided by `DatabaseModule`, this rule is structural, not just cultural.

---

## 11. Enforcement (ESLint Boundary Rules)

A real plugin — `packages/config/eslint-plugin-repo-boundaries` — ships two rules wired into the monorepo ESLint config:

1. `repo-boundaries/no-db-driver-outside-infra` — error: imports of `firebase-admin`, `@google-cloud/*`, `@prisma/client`, `prisma`, `ioredis`, `bullmq` are only allowed from files under `**/infrastructure/**`. Services/controllers/domain can never reach a driver.
2. `repo-boundaries/no-cross-boundary-import` — error: code outside `infrastructure/database/**` may not deep-import `../infrastructure/...` files; the DI container (`DatabaseModule`) is the only bridge. Controllers/services therefore cannot bypass ports.

Run locally with `npm run lint`; enforced in CI on every PR (fail on error).

---

## 12. Implementation Map (where each section lives in the repo)

| § | Deliverable | Location |
|---|---|---|
| 1–1.2 | Hexagonal port/adapter + provider factory | `apps/api/src/infrastructure/database/database.module.ts`, `provider.factory.ts` |
| 2 | Monorepo tree | repository root (this tree) |
| 3 | Domain entities | `packages/domain/entities/*.ts` |
| 4 | Repository interfaces (ports) | `packages/domain/repositories/*.interface.ts` |
| 5 | Adapters (Firestore + Postgres) + mappers | `apps/api/src/infrastructure/database/{firestore,postgres}/{repositories,mappers}/` |
| 6 | Canonical SQL DDL + Prisma mirror | `infra/postgres/schema.sql`, `seed.sql`; `apps/api/src/infrastructure/database/postgres/schema.prisma` |
| 7 | Firestore prototype schema + rules + indexes | `infra/firestore/{firestore.rules,firestore.indexes.json}` |
| 8 | ID generation | `packages/domain/utils/id-generator.ts` |
| 9 | Migration tooling | `scripts/{export-firestore,migrate-to-postgres,verify-migration}.ts` |
| 10 | Module ownership map | `apps/api/src/modules/*` (mirrors §2 tree) |
| 11 | Enforcement | `packages/config/eslint-plugin-repo-boundaries/`, root `.eslintrc.js` |

**What's deliberately deferred to later docs:** business logic internals of each service (→ Doc 2), full endpoint contracts/DTOs (→ Doc 3), component/page trees (→ Doc 4), visual styling (→ Doc 5), and security/testing/scalability procedures (→ Doc 6). This keeps Doc 1 a clean, stable foundation that the other five docs build on without needing to re-litigate the data model.

---

**Doc 1 complete.** Doc 2 (🫀 Muscles & Organs) builds directly on this skeleton: RBAC engine internals, auth engine, quota engine, moderation engine, API-key verification pipeline, and job workers — file by file.
