# Doc 2 Additive A — AI Service Engine (full + deployment flexibility): Checklist & DoD

Status legend: ✅ verified in-sandbox (evidence below) · ⬜ requires a live
Postgres/Firestore-emulator runner or an external sign-off environment
(real provider keys, GCP KMS reachability, reviewer machine) · 🔶 partial.

> Behaviour + structure evidence is automated and green in-repo:
> `npx tsx scripts/check-doc2.ts` → **87 passed, 0 failed** (static) and
> `npx vitest run apps/api/test/ai` → **56 passed** (9 suites).
> Doc-1's closing addendum still applies: this matrix is filled with dated,
> verified evidence, and Doc 2 is announced only when every box has evidence.

Source material for this additive was delivered in chat (not attached as a
file); this doc is the repository-side requirements+DoD record so the state
is reviewable. Additive A is scoped on top of Doc 2's core (Twitter sync /
social-import moderation engines are NOT part of this additive — the AI
engine is built against seams they will call in later Doc-2 work).

## A. Providers & Provider Adapters (`infrastructure/ai/adapters/`)
- [x] `IAiProviderAdapter` port in `packages/domain` (complete/request + response; isHealthy probe) — `ai-provider.adapter.interface.ts`
- [x] Adapters implement the port for `openai`, `groq`, `gemini`, `anthropic`, `azure_openai`, `custom` (OpenAI-compatible endpoint) and `mock` — factory in `adapters/index.ts`; **plain fetch, zero vendor SDKs**
- [x] MockAdapter deterministic (classify/spam/sentiment/summarize/reply/translate behaviours derived from the seeded prompt templates; failure-scenario knob `settings.mockScenario` for tests)
- [x] Provider secrets stored **encrypted** (`api_key_encrypted` blob) and decrypted only in-memory through the KMS port (`IKmsDecryptor`) — dev `env-kms.adapter.ts` (`mock://`, `env:VAR`, `plain:`) + `gcp-kms.adapter.ts` REST implementation for production blobs
- ✅ evidence: `scripts/check-doc2.ts` C; unit `mock-adapter.test.ts`, `kms-decryptor.test.ts`
- ⬜ Real-provider live call (each vendor endpoint returns a valid completion) — external/CI sign-off with real keys; wire formats + status/retryable mapping covered by `adapters/http-clients.ts`

## B. Provider Registry & Routing
- [x] `ProviderRegistryService` — loads active providers, decrypts keys, binds adapters; circuit breaker `consecutiveFailures > 3` opens, health job closes
- [x] `RoutingService` implements **all six** strategies: `round_robin`, `weighted`, `failover` (primary pool + fallbacks), `cheapest` (per-token price), `fastest` (recent avg success latency), `single`
- [x] No business code touches an adapter directly — boundary lint rule `repo-boundaries/no-ai-adapter-outside-ai-infra` (test files exempt); only `AiOrchestratorService.executeTask` is exported to engines
- ✅ evidence: `routing.service.test.ts` — dedicated per-strategy tests; weighted distribution asserted within **±5% over 1000 draws** (`0.75±0.05` for 3:1 weights); circuit-open exclusion asserts `NoAvailableProviderError`
- ⬜ Weighted distribution over a *live* dual-adapter run (CI matrix) — emulator/Postgres runner item

## C. Orchestration (single AI entry point)
- [x] `AiOrchestratorService.executeTask(taskType, vars, tenantId?, appId?)` is the only AI entry point used by caller engines; the Doc-1 `AiClassifierService` stub was **replaced** by an orchestrator-delegating classifier (`modules/integrations/ai-classifier.service.ts`, task `classify_testimonial`)
- [x] Pipeline: guardrails → task config → prompt render → **cache lookup** → route → attempts (failover/retries) → output guardrails → parse → confidence decide → log row **per attempt (success AND failure)** → result
- [x] Retries: budget = `maxRetries + 1` attempts rotating the routed pool; exhausted ⇒ `AiExecutionError` (never a silent partial)
- [x] Cached responses: `fromCache: true`, `logId: null`, **no new log row**
- ✅ evidence: `orchestrator.service.test.ts` — happy path decision/log/cost/latency, cache no-row, `AiInputRejectedError` pre-LLM with zero log rows, `AiExecutionError` after N failures with one `error` row per attempt, circuit opens at >3 and closes after health probe

## D. Confidence Policy
- [x] `ConfidenceService.decide` ladder: `< 0.30` ⇒ `reject`; `autoApproveThreshold` reached ⇒ `auto`; else `human_review`; missing confidence ⇒ `human_review`
- [x] Defaults table shipped in code + seed: `detect_spam 0.80/0.95`, `classify_testimonial 0.75 / autoApproveThreshold = null` (**never auto-publishes** — social imports always land in moderation; the moderation path hardcodes pending)
- ✅ evidence: `confidence.service.test.ts` (boundary 0.3, auto ladder, classify never-auto hard rule, detect_spam defaults)

## E. Prompt Templates & Guardrails
- [x] `PromptTemplateService` — `{{var}}` render, `extractVars`, missing-var error, **injection sanitization** (meta-characters / "ignore previous instructions" / role-play patterns in template or values ⇒ `AiInputRejectedError`)
- [x] `AiGuardrailsService.validateInput` **pre-LLM**: injection patterns, length cap, PII redaction (email/phone/SSN/card/IP → `[x-redacted]`); `validateOutput` strips `<script>`, event handlers, `javascript:`/`data:` URLs
- ✅ evidence: `guardrails.service.test.ts` + `prompt-template.service.test.ts` — **adversarial injection is blocked before any provider call** (asserted at orchestrator level: adapter never invoked, no log row)
- ⬜ Injection live-proof against a real model (external sign-off item)

## F. Cost Tracking & Human Review Feedback
- [x] `AiCostTrackerService.computeCostUsd` — exact `input×rate_in + output×rate_out`, single round at 6dp (`NUMERIC(10,6)`); zero-cost mock asserted
- [x] Cost aggregation port (`getCostAggregation` → `totalCostUsd/byProvider/byTask/byDay`) implemented in **both** adapters for the AI & Costs dashboard
- [x] `AiReviewService` — `flag` / `override(humanValue, rating)` / `rateQuality(1–5)`; feedback loop **auto-downweights a provider when 7-day human-override rate > 20%** (halves `provider_weights` in weighted-routing configs; small samples <10 skipped)
- ✅ evidence: `cost-tracker.service.test.ts`, `review.service.test.ts`
- ⬜ Dashboard endpoint/UI wiring lives with Doc-2 core dashboards (not this additive)

## G. Request Logs & Data Model (dual engine)
- [x] Domain: `AiProvider`, `AiTaskConfig`, `AiRequestLog` (+ `AiTaskResult`, `AiCostSummary`, `AiQualityReport`), 3 repo ports + `findRecentSuccess` cache lookup, AI errors, `AI_PROVIDER/AI_TASK_CONFIG/AI_REQUEST_LOG/KMS` tokens
- [x] `infra/postgres/schema.sql`: `ai_providers`, `ai_task_configs`, `ai_request_logs` (partitioned monthly; DO block current+next month; `maintain-audit-partitions.sql` grows ahead); **every FK explicit `ON DELETE`** (CASCADE for task/provider refs, SET NULL for tenant/app) — no bare FKs
- [x] `seed.sql` idempotent: mock provider + 6 default task configs with `ON CONFLICT` (classify `auto_approve_threshold NULL`)
- [x] Prisma mirror models + enums + typed-delegate getters (partition documented deviation, like `audit_logs`)
- [x] Dual adapters × 2 engines: `firestore|postgres-ai-provider/task-config/request-log.repository.ts` + per-engine mappers; factory binding rows; Firestore seed twins in `scripts/seed-firestore.ts`
- ✅ evidence: `check-doc2.ts` A/D/E; parity scripts compile (`SEED_TS_OK`); domain + api typechecks green
- ⬜ Live-DB runs of the new tables (schema apply, partition inserts, seed re-run, repo round-trips × 2 engines) — CI `postgres` + `firestore` jobs
- ⬜ Non-author reviewer migration rehearsal comparing AI rows Firestore↔Postgres — reviewer/CI step

## H. Deployment Flexibility & Safety-in-CI
- [x] **Zero real LLM cost in CI**: mock provider is the only seeded provider; every non-AI test suite and the CI path can run without keys
- [x] AI config surfaces env-managed: `.env.example` documents `AI_HEALTH_CHECK_INTERVAL_MS`, `AI_HEALTH_JOB_ENABLED`, KMS/GCP + per-vendor variables (provider rows added via admin dashboard, keys stored as KMS blobs)
- [x] No GCP SDK / storage imports added under `apps/api/src/modules` (boundary lint); Docker/render deployment unchanged by this additive (engine is plain fetch + DI)
- ✅ evidence: `check-doc2.ts` B/G/I + api boot smoke (AiModule initializes, health job schedules, graceful degrade when Firestore project unavailable)
- ⬜ Docker image build + Render deploy exercise with the AI engine enabled (external CI/deploy sign-off, tracked in `.github/workflows/ci.yml`)

## I. Addendum: Closing Evidence & Sign-Off Gate
In-sandbox (dated 2026-09-07):
- `npx tsx scripts/check-doc2.ts` → `=== Doc-2 Additive A checklist: 87 passed, 0 failed ===`
- `npx vitest run apps/api/test/ai` → 9 files / **56 tests passed**
- `npx tsc -p packages/domain/tsconfig.json` + `npx tsc -p apps/api/tsconfig.json --noEmit` → clean
- API boot (firebase engine) with `AiModule` + `ProviderHealthJob` + orchestrator DI → `/v1/health` 200; registry refresh degrades gracefully without a GCP project
- Static checks: entity/port/barrel coverage, dual repo+mapper parity ×3 entities, factory bindings, SQL FK explicitness + monthly partition block, seed idempotency (`17 INSERT = 16 ON CONFLICT + 1 NOT-EXISTS-guarded`), prisma mirror + delegate getters, adapter boundary rule enabled, classifier seam delegates to orchestrator

Remaining for full Doc-2-Additive-A close (external/CI, like Doc-1's live items):
1. Real-provider end-to-end (one call per supported vendor) — external sign-off with keys
2. Failover live proof across providers + circuit reopen via health job on a running Postgres/Firestore deployment
3. Live injection-blocked-against-real-model proof
4. CI: `postgres` + `firestore` jobs exercise the new tables/repos; secret-scan covers `.env` blobs
5. Non-author reviewer: clone → emulator → seed → flip `DATABASE_PROVIDER=postgres` → identical AI rows, zero code change
6. This checklist filled, dated, attached to the Doc-2 additive merge

**Checked & dated:** 2026-09-07 — every sandbox-provable item proven (87 static + 56 unit checks). Live/external items remain marked ⬜ and route through `.github/workflows/ci.yml` + reviewer sign-off.
