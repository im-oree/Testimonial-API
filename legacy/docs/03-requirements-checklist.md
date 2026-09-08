# Doc 3 — Requirements Checklist: Evidence Status

> Source: delivered in chat and preserved verbatim via `next.md` on the
> repository `main` branch (2026-09-07). This top note is the only addition —
> the original requirement text below is untouched so the DoD stays reviewable.
> Status legend: ✅ verified in-sandbox (evidence noted) · ⬜ needs a live
> Postgres/Firestore-emulator runner, browser/device, or external keys · 🔶
> partial. Doc 3 is complete only when Section N (Sign-Off Gate) passes and
> every box carries dated evidence (Doc-1 addendum rule applies).

---
# DOC 3 — REQUIREMENTS CHECKLIST (continued)

## E. Testimonial Lifecycle Checks (continued)

- [ ] Create → pending → approve → approved: full lifecycle via API returns correct status at each step, and the testimonial only appears in `GET /v1/public/testimonials` (pk_*) **after** the approve step — verified end-to-end
- [ ] Create → pending → reject → rejected: rejected testimonial never appears in public API — verified
- [ ] Approved → archived → pending (re-open): state machine allows this transition and the testimonial disappears from public API while archived, reappears after re-approval — verified
- [ ] Archived → approved (direct): returns `422 INVALID_TRANSITION` — verified (must go through pending first)
- [ ] Bulk approve with 10 IDs where 2 are already archived: returns `succeeded: 8, failed: 2` with specific failure reasons — not a blanket failure — verified
- [ ] Duplicate fingerprint detection: submitting the same author+message twice returns `409 DUPLICATE` with the existing testimonial ID in the error detail — verified
- [ ] CSV import job: upload a 50-row CSV, poll `GET /v1/dashboard/jobs/:jobId`, confirm status transitions `processing → completed` with correct `imported`/`skipped` counts — verified

## F. Collection Form Checks

- [ ] `GET /v1/public/forms/:formSlug` returns the full form schema including tenant branding, without requiring any API key — verified
- [ ] `POST /v1/public/forms/:formSlug/submit` with valid data + valid hCaptcha token creates a testimonial with `status: pending` — verified
- [ ] `POST /v1/public/forms/:formSlug/submit` with `consentGiven: false` on a form that requires consent returns `422 VALIDATION_ERROR` — verified
- [ ] `POST /v1/public/forms/:formSlug/submit` with missing required question returns `422` with specific field-level error identifying which question was missed — verified
- [ ] `POST /v1/public/forms/:formSlug/submit` with invalid hCaptcha token returns `422` — verified (mock hCaptcha in test)
- [ ] `POST /v1/public/forms/:formSlug/upload-url` returns a valid signed GCS/S3 URL that expires within 5 minutes — verified
- [ ] Form submission rate limiting: 20 submissions from the same IP within 1 minute triggers `429 RATE_LIMITED` — verified

## G. Widget Embed Checks

- [ ] `GET /v1/public/widgets/:widgetId` with valid `pk_*` returns the full widget config + pre-filtered approved testimonials in a single response — verified
- [ ] `GET /v1/public/widgets/:widgetId` for an unpublished widget returns `404` — verified (unpublished widgets are not accessible even with valid key)
- [ ] Widget response includes only testimonials matching the widget's configured filters (tags, minRating, featuredOnly, limit) — verified by creating a widget with `minRating: 4` and confirming no 3-star testimonials appear
- [ ] Widget response respects the widget's `templateVersion` pin — verified by updating the global template to v4 while the widget pins v3, confirming v3 config schema is returned

## H. Webhook Checks (Outbound)

- [ ] Creating a webhook endpoint and then approving a testimonial triggers a delivery to the configured URL with the correct event payload — verified using a local webhook listener (e.g., `webhook.site` or `ngrok`)
- [ ] Webhook payload includes correct `X-TestimonialAPI-Signature` header that passes `verifySignature()` from the Node SDK — verified round-trip
- [ ] Webhook delivery to a URL that returns 500 triggers retry at 1m, 5m, 30m intervals — verified by inspecting `webhook_deliveries` table timestamps (use accelerated test clock)
- [ ] Webhook delivery to a URL that returns 200 on the 3rd retry correctly marks `status: success` and stops retrying — verified
- [ ] Manual "Resend" creates a new delivery record with `attempt: 1` while preserving the original failed delivery record — verified by checking both records exist in DB
- [ ] Webhook endpoint with `events: ["testimonial.approved"]` does NOT receive `testimonial.created` events — verified (event filtering works)

## I. Realtime WebSocket Checks

- [ ] Connecting with a valid JWT and joining `app:{appId}` channel succeeds; joining `app:{otherAppId}` (not belonging to user's tenant) is rejected — verified
- [ ] Approving a testimonial via API triggers `testimonial.status_changed` event on the `app:{appId}` channel within 2 seconds — verified with a connected test client
- [ ] Editing staff permissions triggers `permissions_changed` on `user:{uid}` channel — verified
- [ ] Force-logout (session revoke) triggers `session_revoked` on `user:{uid}` channel — verified
- [ ] Reconnecting after disconnect automatically re-joins previously subscribed channels (Socket.IO built-in, but verified it works with the auth handshake) — verified

## J. SDK Checks

- [ ] `@testimonial-api/node`: `client.testimonials.list()` returns typed `PaginatedResult<Testimonial>` matching the API response shape — verified with a real test key against staging
- [ ] `@testimonial-api/node`: `client.webhooks.verifySignature()` correctly validates a real webhook payload from the API — verified round-trip
- [ ] `@testimonial-api/react`: `<TestimonialCarousel>` renders testimonials in the browser using a `pk_*` key — verified in a test Next.js app
- [ ] `@testimonial-api/react`: `useTestimonials()` hook returns `data`, `loading`, `error` states correctly — verified
- [ ] `@testimonial-api/widget`: the `<script>` tag embed loads and renders a widget on a plain HTML page — verified in a static HTML file opened in browser
- [ ] All SDKs handle `429 RATE_LIMITED` responses by reading `Retry-After` header and backing off — verified by mocking a 429 response

## K. File Upload Checks

- [ ] Image upload re-encodes to WebP, strips EXIF, and resizes to max 400x400 — verified by uploading a 5MB JPEG with GPS EXIF data and confirming the output is a <100KB WebP with no EXIF
- [ ] Image upload rejects files > 5MB with `413 FILE_TOO_LARGE` — verified
- [ ] Image upload rejects non-image MIME types with `415 FILE_TYPE_NOT_ALLOWED` — verified (attempted uploading a `.exe` renamed to `.jpg`)
- [ ] Video upload signed URL expires within 5 minutes and rejects uploads after expiry — verified

## L. Error Handling Checks

- [ ] Every error code in §0.8's table is producible by some API call and returns the correct HTTP status — verified by triggering each one in a test suite
- [ ] No endpoint ever returns a raw stack trace or internal error message in the response body — verified by forcing an unhandled exception and confirming the response is `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` with no stack trace (stack trace goes to Sentry only)
- [ ] Validation errors return field-level `details` array identifying exactly which fields failed and why — verified with a request containing 5 invalid fields, confirming all 5 appear in `details`

## M. Documentation Artifacts

- [ ] OpenAPI 3.1 spec auto-generated from NestJS decorators and accessible at `/v1/docs` (Swagger UI) — verified all endpoints appear with correct schemas
- [ ] OpenAPI spec validates clean against `swagger-cli validate` or equivalent — no schema errors
- [ ] Postman collection exported and committed to `/docs/postman/` with environment variables for `baseUrl`, `pk_test`, `sk_test`
- [ ] SDK README files (`packages/sdk-node/README.md`, `packages/sdk-react/README.md`) contain copy-paste-ready quickstart examples matching the actual API

## N. Sign-Off Gate

Doc 3 is only complete when:

1. A developer who has never seen this codebase can read the OpenAPI spec at `/v1/docs`, generate a client (e.g., via `openapi-generator`), and successfully complete the full testimonial lifecycle (create → approve → fetch via public API → see in widget) using only the generated client and the documented auth flow — no source code reading required.
2. The full automated test suite (unit + integration + e2e) passes against **both** database adapters from Doc 1, covering every endpoint listed in this document.
3. A security-focused reviewer confirms that no endpoint leaks cross-tenant data, no public-key endpoint exposes pending/rejected testimonials or author emails, and no error response leaks internal implementation details.
4. CI is green, this checklist is fully checked, and the milestone PR is approved.

**An endpoint with no negative test cases (only happy-path) is not considered done.**

---

Say **"Doc 4"** and I'll deliver the Skin — the complete frontend architecture for both dashboards (Platform + Tenant), every page, every component (structural, unstyled), the full file-by-file component tree, state management, routing, and data-fetching patterns, all built to consume the exact API contracts defined here in Doc 3.

---

## Progress log (dated evidence, newest last)

- **2026-09-07 — Section E foundation (lifecycle domain + services):**
  - Domain error catalogue extended with the Doc-3 codes: `DUPLICATE` (409),
    `INVALID_TRANSITION` (422), `FILE_TOO_LARGE` (413), `FILE_TYPE_NOT_ALLOWED`
    (415) + helper classes (`DuplicateError`, `InvalidTransitionError`,
    `ValidationError`, `FileTooLargeError`, `FileTypeNotAllowedError`).
  - Pure state machine shipped: `packages/domain/src/state/testimonial-state.ts`
    (transitions, public-visibility rule: ONLY `approved` is public;
    `archived → approved` direct is invalid — reopen to pending first).
    Exported via `packages/domain` barrel.
  - `ModerationService` now enforces the machine (`approve/reject/archive/
    reopen/transition`) — illegal moves throw `422 INVALID_TRANSITION` with
    from/to details; missing rows `404`; `bulk(action, ids)` returns per-row
    `succeeded[]/failed[]` (never a blanket failure).
  - `TestimonialService.create` dedupe now throws `409 DUPLICATE` with
    `details.existingId` (was generic CONFLICT).
  - Evidence: `apps/api/test/doc3/` → **13 tests green** (state matrix incl.
    reopen cycle, direct-archive-to-approved = 422, bulk approve 8-succeed/
    2-fail archived w/ reasons, duplicate 409 w/ existingId, 404 missing);
    `turbo run typecheck test lint` 13/13 (69 api tests); doc-1 167/0 and
    doc-2 87/0 still green.
  - NOT yet evidenced (next slices): real REST routes + API-key resolution for
    public/dashboard endpoints, e2e lifecycle against both DB engines,
    CSV-import job rows (`GET /v1/dashboard/jobs/:jobId`), and the §E boxed
    claims marked ⬜ until those run in CI/reviewer environments.
