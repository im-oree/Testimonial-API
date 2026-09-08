# DOC 6 — "The Immune System": implementation status in the demo

Source spec: `next.md` on `main` (Security Hardening, Threat Prevention, Penetration
Testing, Scalability, DevOps & Disaster Recovery; 1,314 lines).

This file maps every DOC 6 requirement to the **current demo codebase**
(`server/` Express + in-memory seeded `demo-data.ts`, `client/` React SPA).
Statuses:

- **[done] demo-done** — implemented and verified in this repo.
- **N/A (demo engine)** — the attack surface does not exist in this demo
  (no SQL, no XML, no cookies, no outbound HTTP, no file uploads, no DB/Redis/cloud).
  It still applies to the production engine DOC 6 targets; this demo replaces it by design.
- **[pending] production-only** — requires the real engine / infra (Postgres, Redis,
  Firebase, GCP/Render, Docker, k6…). Tracked for the production build, not this demo.

Run the automated suite that backs the [done] rows:

```bash
npm run test:security        # = npm --prefix server run test:security
```

CI (`.github/workflows/ci.yml`) runs typecheck, the security suite, and the client
build on every push/PR — a failing security test blocks merge (DOC 6 §8 / checklist I).

---

## §0–2 — Architecture, threat model & attack vectors

| DOC 6 requirement | Status | Evidence / notes |
|---|---|---|
| SQL injection prevention (§1, checklist A) | N/A (demo engine) | Zero SQL anywhere in `server/src`; in-memory store only. Applies to the Prisma/Postgres production engine. |
| XSS (§2.1, checklist B) | [done] demo-done | No `dangerouslySetInnerHTML`, `innerHTML=`, `eval`, `document.write` (grep-clean). React auto-escapes every user field; public forms render text only. |
| CSRF (§2.2) | N/A (demo engine) | Token sessions in headers/URL, **no cookies** -> nothing for a cross-site request to auto-send. Applies to the cookie-based production engine. |
| SSRF (§2.3) | N/A (demo engine) | Server makes no outbound HTTP (no webhook delivery, no AI calls in the demo). |
| IDOR — tenant isolation (§2.4) | [done] demo-done | Every app-scoped route verifies ownership; **foreign `appId` -> 404** (see `rowsForApp`/`requireTenantOfApp` in `server/src/lib.ts`). Cross-tenant suite in `server/test/security.test.ts`. |
| Mass assignment (§2.5) | [done] demo-done | Mutating routes build field whitelists; `status` only via moderation `action` enum; `answers` must be an object; question count/labels capped in `normalizeQuestions`. |
| Path traversal / uploads (§2.6) | N/A (demo engine) | No file serving or upload endpoints in the demo. |
| XXE (§2.7) | N/A (demo engine) | JSON-only API (`express.json`); no XML parser anywhere. |
| Open redirect (§2.8) | [done] demo-done | Login `next` only accepts same-origin relative paths (`LoginPage.tsx`). |
| DoS (§2.9) | [done] demo-done (partial by design) | 1 MB body cap, pagination `min/max` caps, bulk moderation capped at 100 IDs, question/option/tag caps. Rate limiting is production-only (needs Redis). |
| Supply chain (§2.10) | [pending] production-only | npm audit / Dependabot / gitleaks belong in the prod pipeline (CI here is minimal by design). |
| Prompt injection (§2.11) | N/A (demo engine) | No AI features in the demo engine. |

## §3 — Auth & session hardening

| DOC 6 requirement | Status | Evidence / notes |
|---|---|---|
| Passwords argon2id (§3.1) | [pending] production-only | Demo uses seeded plaintext demo creds (`demo1234`) in the in-memory store by design. |
| JWT RS256 + short expiry (§3.2) | [pending] production-only | Demo uses HMAC-SHA256 stateless tokens (survive restarts; see `server/src/session-tokens.ts`). RS256/expiry apply to the real auth engine. |
| Token tamper / `alg:none` rejection | [done] demo-done | Constant-time HMAC verify; suite asserts tampered/garbage/`alg:none` -> 401. |
| API key security (§3.3) | N/A (demo engine) | Demo API keys are display-only seed rows (`server/src/demo-data.ts`); no real keys issued. |
| Session security flags (§3.4) | N/A (demo engine) | No cookies in the demo (flag-less design) — deliberate, keeps preview iframes working. |

## §4 — Data protection

| DOC 6 requirement | Status | Evidence / notes |
|---|---|---|
| Encryption at rest / in transit | [pending] production-only | In-memory demo data; TLS is the sandbox/preview layer's job. |
| PII minimization | [done] demo-done (demo scope) | Public API never returns emails/secrets; author name capped at 120 chars; submissions only read known question ids. |
| GDPR / NDPR data rights (§4.4) | [pending] production-only | Needs the real engine + storage. |
| Data retention & purge (§4.5) | N/A (demo engine) | In-memory data resets on server restart by design. |

## §5 — Infrastructure security

Container, secrets-store, IAM, VPC, network egress -> **[pending] production-only**.
Demo equivalent [done]: the session signing secret (`server/.session-secret`) is
0600 and git-ignored; logs print only an 8-char token prefix; error responses are
JSON with no stack traces; `x-powered-by` removed.

## §6–7 — Penetration test & load/scalability

**[pending] production-only / N/A (demo engine)** — external pentest, k6, DB/Redis
scalability all require the deployed production engine. The demo replaces them with
the automated suite above run in CI on every change.

## §8 — DevOps / CI-CD

| DOC 6 requirement | Status | Evidence |
|---|---|---|
| CI gates (typecheck) | [done] demo-done | `.github/workflows/ci.yml` |
| CI runs security suite and blocks merge on failure | [done] demo-done | Same workflow: `npm --prefix server run test:security` |
| npm audit / gitleaks / Semgrep / Trivy / license | [pending] production-only | Add when the production pipeline exists. |
| Canary deploys, monitoring alerts, on-call | [pending] production-only | — |

## §9 — Disaster recovery

**[pending] production-only** — backups, RTO/RPO, failover drills need real infra.

## §10 & Definition-of-Done checklist (A–L)

| Section | Verdict for the demo |
|---|---|
| A. SQLi | N/A (no SQL) — [done] for the demo engine |
| B. XSS | [done] grep-clean + React escaping (no write-time DOMPurify: no HTML is ever allowed or rendered) |
| C. CSRF / SSRF / IDOR / mass assignment | [done] IDOR suite 404s all entity types; mass assignment blocked by whitelists; CSRF/SSRF N/A |
| D. Auth & authorization | [done] server-side RBAC suite (viewer/editor can't moderate, owner can); cross-kind 401s; token tamper 401s. Password/JWT crypto: [pending] production-only |
| E. Data exposure / hygiene | [done] demo scope: clamped ratings (1–5), capped text/name/lengths, no secret/email leakage. EXIF/TLS/KMS: N/A |
| F. Infrastructure | [done] demo scope: security headers, no stack traces, secret hygiene. Docker/IAM/rate-limit: [pending] |
| G. Penetration testing | [pending] production-only (suite in CI is the demo's substitute) |
| H. Load & scalability | [pending] production-only |
| I. DevOps / CI-CD | [done] demo scope: security suite in CI. Audit/Semgrep/gitleaks: [pending] |
| J. Disaster recovery | [pending] production-only |
| K. Compliance | [pending] production-only (needs legal review + real data flows) |
| L. Sign-off gate | The production gate, not a demo gate. Demo is done when `npm run typecheck`, `npm run test:security`, and `npm run build:client` are green. |

---

## Deliberate deviations (and why they're safe here)

1. **No expiry on session tokens.** Tokens are HMAC-signed with a persisted secret
   (`server/.session-secret`). Expiry would reintroduce the restart-invalidation
   failure this sandbox demo exists to avoid. Expiry/rotation land with the real engine.
2. **No CSP / frame-ancestors on the API or SPA.** The demo must remain embeddable in
   the sandbox preview iframe. XSS is handled by escaping (no `innerHTML`, React
   auto-escapes) rather than by CSP.
3. **Demo passwords are plaintext seeds.** In-memory store, dev-only accounts.
4. **`rowsForApp` 404s foreign apps instead of returning empty 200** — matches
   DOC 6 §2.4 ("404, not 403/empty — don't confirm existence").
