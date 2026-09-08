# Doc 4 — The Skin: Requirements Checklist & DoD (evidence status)

> Source: delivered in chat 2026-09-07 (verbatim full spec retained in that
> message; this file carries the acceptance checklists A–J verbatim plus the
> architecture registry and the dated evidence/progress log). Status legend:
> ✅ verified in-sandbox (evidence noted) · ⬜ needs a browser/device/CI
> runner (Lighthouse, Playwright, Storybook, two-window realtime, QR camera,
> VoiceOver) or backend contracts from Doc 3 · 🔶 partial. Doc 4 is complete
> only when Section J (Sign-Off Gate) passes and every box carries dated
> evidence (Doc-1 addendum rule applies).

---

## A. Structural Existence Checks
- [x] All three Next.js apps (`platform-dashboard`, `tenant-dashboard`, `public-forms`) exist with the exact route structures defined in §§3, 4, 5
- [x] Every page listed in §§3 and 4 has a corresponding `page.tsx` file in the correct App Router directory
- [x] Every component listed in §6 exists as a separate file in `packages/ui/components/` with the exact filename specified
- [x] Every data-fetching hook listed in §7 exists in the correct app's `hooks/` directory
- [ ] `packages/shared-types/` contains TypeScript interfaces matching every API response shape from Doc 3 — verified by importing them in both frontend and backend
- [x] `packages/ui/lib/api-client.ts` exists with auth interceptors for 401 (refresh) and 409 (perm stale) handling
- [x] `packages/ui/lib/query-keys.ts` exists with the full key factory from §1.2
- [x] `packages/ui/lib/socket.ts` exists as a Socket.IO client singleton
- [x] `packages/ui/hooks/use-realtime.ts` exists and is called in the dashboard layout

## B. Auth Flow Checks
- [ ] Login page renders email/password form and Google SSO button
- [ ] Successful login redirects to `/overview` (or `?next=` deep link)
- [ ] MFA challenge page renders after login when `requiresMfa: true`
- [ ] MFA verification completes the session and redirects to dashboard
- [ ] Onboarding page validates invite token, allows password setup, and creates the staff record
- [ ] First-run checklist renders for new tenant owners and tracks completion steps
- [ ] Session refresh happens silently on 401 — user sees no interruption
- [ ] PERM_STALE (409) triggers silent `/me` refetch and request retry — user sees no error
- [ ] Session revocation via WebSocket immediately redirects to `/login`
- [ ] Impersonation banner renders when `useImpersonationStore.isImpersonating` is true, shows tenant name, and has an exit button that calls `endImpersonation()`

## C. Permission-Gated UI Checks
- [ ] Sidebar nav items are filtered by the user's effective permissions — a viewer sees only Overview, Testimonials (read), and Settings; an editor additionally sees Forms and Widgets; an owner sees everything
- [ ] Changing a staff member's role in the Team page causes their sidebar to update within 2 seconds (via `permissions_changed` WebSocket event → `/me` refetch → sidebar re-render) — verified with two browser windows
- [ ] Page-level guards render a ForbiddenPage component when a user navigates directly to a URL they lack permission for (e.g., a viewer navigating to `/webhooks`)
- [ ] Action buttons (Approve, Delete, Rotate Keys, etc.) are hidden or disabled when the user lacks the required permission — verified for at least 5 different actions across different roles
- [ ] The "Create App" button is hidden when the user is at their plan's app limit (quota check) — verified

## D. Data Fetching & Caching Checks
- [ ] Navigating between pages that share data (e.g., Overview → Testimonials) does not re-fetch already-cached data — verified via network tab (no duplicate requests within staleTime)
- [ ] Approving a testimonial optimistically updates the UI before the server responds — verified by throttling network to 3G and confirming the status badge changes instantly
- [ ] If the optimistic update's server call fails, the UI rolls back to the previous state and shows an error toast — verified by mocking a 500 response
- [ ] Paginated tables preserve previous page data while loading the next page (`keepPreviousData`) — no flash of empty state — verified
- [ ] WebSocket events (`testimonial.new_pending`, `testimonial.status_changed`) correctly invalidate the relevant React Query caches and trigger refetches — verified by approving a testimonial in one browser window and confirming the other window's pending count updates within 2 seconds
- [ ] Switching the active app (via AppSelector) correctly scopes all queries to the new `appId` — verified by checking that the testimonials table shows the new app's data

## E. Component Functionality Checks
- [ ] DataTable supports sorting (click column header), filtering (via filter inputs), pagination (page controls), and row selection (checkbox column) — verified with a 100-row seeded dataset
- [ ] TestimonialKanban supports drag-and-drop between columns (Pending → Approved) and triggers the correct API mutation on drop — verified
- [ ] BulkActionBar appears when rows are selected and correctly executes bulk approve/reject/tag actions — verified with 10 selected rows
- [ ] FormBuilder renders questions dynamically based on the form schema, supports adding/removing/reordering questions, and live-previews the result in an iframe — verified
- [ ] WidgetBuilder renders the widget preview using the actual widget renderer (same code as the embed script), updates live as style overrides change, and generates correct embed code for all three types (script, iframe, React) — verified
- [ ] ImportCsvDialog correctly parses a CSV file, allows column mapping, previews the first 5 rows, and submits the import job — verified with a 50-row test CSV
- [ ] ColorPicker updates the tenant's `brandColor` and the change is reflected in the widget preview within the same session — verified
- [ ] CopyButton copies the correct text to clipboard and shows "Copied!" feedback — verified
- [ ] CodeBlock renders embed code with syntax highlighting and a copy button — verified for script, iframe, and React snippets
- [ ] QrCodeDisplay generates a valid QR code that, when scanned, opens the correct form URL — verified with a phone camera
- [ ] ChartCard renders Recharts charts with consistent styling, tooltips, and responsive sizing — verified for Line, Area, Bar, and Pie variants
- [ ] ConfirmDialog and DestructiveConfirmDialog prevent accidental actions — the destructive variant requires typing the exact confirmation string — verified

## F. Public Form Checks
- [ ] Public form page SSR-renders the correct form schema and tenant branding — verified by visiting the URL directly (no JS required for initial render)
- [ ] Form submission with valid data + hCaptcha creates a pending testimonial and redirects to the success page — verified
- [ ] Form submission with missing required fields shows inline validation errors — verified
- [ ] Video upload via signed URL works end-to-end: get URL → upload → include in submission — verified with a 10MB test video
- [ ] Form respects the tenant's branding (logo, color, name) — verified

## G. Realtime Checks
- [ ] Socket.IO connection authenticates with the JWT at handshake — verified by inspecting the connection in the backend logs
- [ ] Joining a channel the user is not authorized for is rejected by the server — verified
- [ ] Reconnecting after a network disconnect automatically re-joins channels and resumes receiving events — verified by toggling airplane mode

## H. Accessibility Checks
- [ ] All Radix-based components (Dialog, Select, DropdownMenu, Tabs, etc.) are keyboard-navigable — verified by tabbing through every interactive element
- [ ] All form inputs have associated `<label>` elements — verified via Lighthouse audit
- [ ] All interactive elements have visible focus indicators — verified
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text) — verified via Lighthouse (full styling pass in Doc 5, but structural contrast is set here)
- [ ] Screen reader announcements for toast notifications and dynamic content updates — verified with VoiceOver/NVDA

## I. Performance Checks
- [ ] Dashboard shell (sidebar + topbar) renders in <500ms on a cold load — verified via Lighthouse Performance score
- [ ] Testimonials table with 100 rows renders in <200ms after data is cached — verified via React DevTools Profiler
- [ ] Widget builder preview updates within 100ms of a style change — verified
- [ ] No component re-renders more than twice per user action — verified via React DevTools Profiler (excessive re-renders indicate missing useMemo/useCallback/React.memo)
- [ ] Bundle size for the tenant dashboard is <300KB gzipped (initial load) — verified via `next build` output and `@next/bundle-analyzer`

## J. Sign-Off Gate
1. A QA tester can navigate every page in both dashboards, interact with every component (create, edit, delete, approve, reject, import, export, embed), and see correct data reflected in real time across two browser windows — following a scripted test plan derived from this document.
2. The full component library in `packages/ui/` renders correctly in Storybook (or equivalent) with all variants visible — no broken imports, no missing props.
3. Lighthouse scores: Performance ≥80, Accessibility ≥95, Best Practices ≥90, SEO ≥90 (for public form pages).
4. CI is green on: TypeScript type-check (`tsc --noEmit`), ESLint, component tests (Vitest + Testing Library), and E2E tests (Playwright) covering the critical flows.
5. This checklist is fully checked and attached to the milestone PR.

> A page with no empty state, no loading state, and no error state is not considered done — all three states must be implemented for every data-driven view.

---

## Progress log (dated evidence, newest last)
### 2026-09-08 — Single-website consolidation (user direction: one website + one backend)
The three Next.js apps (`tenant-dashboard`, `platform-dashboard`, `public-forms`) were merged into
**one app: `apps/web`** (`@testimonial-api/web`). One backend (NestJS `/v1`) serves everything; the
shell shown after login depends on the signed-in role:

| URL | Audience |
|---|---|
| `/` + `/login` (+`/login/mfa`, `/onboarding/[token]`, `/accept-invite/[token]`) | everyone; unified login has a company ↔ platform-staff mode switch (endpoints `/v1/auth/login` vs `/v1/platform/auth/login`) |
| `/app/*` | company/tenant workspace (was tenant-dashboard) — overview, testimonials, moderation, forms, widgets, team, webhooks, audit, billing, settings |
| `/platform/*` | platform staff console (was platform-dashboard) — overview, tenants, staff, billing, webhooks, audit, AI, settings |
| `/forms/[slug]` | public testimonial-submission forms (verbatim from public-forms; external sites can embed/link these or call the API directly with keys) |

Mechanics: route group `app/(dashboard)/` → `app/app|platform/` keeps relative import depth identical;
role-scoped `lib/tenant-types.ts` / `lib/platform-types.ts` replace the colliding `lib/types.ts`;
platform hook renamed `use-audit-logs` → `use-platform-audit-logs` (tenant one restored); NAV arrays
prefixed; root layout now single (fonts + ThemeProviders + ReactQueryProvider). Old app dirs removed;
`scripts/check-doc4.ts` re-targeted at `apps/web` → **186/0** (structural rows consolidated, zero
failures); check-doc1 167/0, check-doc2 87/0, check-doc5 123/0, turbo typecheck 8/8, lint 6/6,
tests 9/9. §B–§J browser/CI boxes remain ⬜ and now target `apps/web`.
### 2026-09-07 — §A slice landed (structural foundation; evidence: `scripts/check-doc4.ts` → 189/0)
- Scaffolded `packages/ui` (src layout, catalog, tsconfig) + three Next.js 15 apps with workspace wiring; `next@15.1.6` added to the three apps; `npm install` clean.
- Full §6 inventory as real files in `packages/ui/src/components/{primitives,layout,data-display,feedback,forms,charts}` (51 files; regenerable via `python3 scripts/generate-doc4-components.py`); `components/ui.tsx` is a catalog barrel + `ReactQueryProvider` (`components/providers.tsx`).
- `packages/ui/lib/query-keys.ts` key factory verbatim per §1.2; `lib/api-client.ts` (401 silent refresh + retry, 409 PERM_STALE → `/me` invalidate + retry, browser-guarded); `lib/socket.ts` singleton (`/live`, autoConnect false); `hooks/use-realtime.ts` event→cache bridge (testimonial.*, permissions_changed, session.revoked, reconnect re-join, ai.task_completed); `hooks/use-me.ts` (`/v1/auth/me`).
- Tenant dashboard: `stores/ui.store.ts` (active-app scoping), 22 §7 hooks in `hooks/`, auth pages (login + MFA + onboarding `[token]` + accept-invite), `(dashboard)` guard layout (useMe + useRealtime + permission-filtered Sidebar + impersonation banner), pages: overview, testimonials (+`[id]` detail, moderation kanban, CSV import dialog + export), forms (list/new/`[id]` editor w/ FormBuilder), widgets (list/new/`[id]` builder w/ live preview + embed CodeBlock), team (role change → `permissions_changed` path), webhooks (+deliveries), audit, billing, settings (branding ColorPicker + API-key rotate). Every data view implements loading/error/empty tri-states.
- Platform dashboard: `stores/impersonation.store.ts` (start/end), 12 §7 hooks, staff login, `(dashboard)` guard with impersonation banner + exit→`/me` refetch, pages: overview, tenants (list; `[id]` detail w/ impersonate/suspend/plan; `[id]/staff`; `[id]/settings` w/ destructive confirm), staff, billing, webhooks, audit, AI ops (providers/task logs/costs tabs), settings.
- Public forms: SSR `app/forms/[slug]/page.tsx` (server fetch, `force-dynamic`, no-store) + client view (branding colors, questions per type incl. rating + video signed-URL slot, hCaptcha token slot, success route), landing + success pages.
- Gates 2026-09-07: `turbo run typecheck` 10/10 tasks green (api + domain/shared-types + ui + 3 apps); `turbo run test` 9/9 green; `check-doc1.ts` 167/0; `check-doc2.ts` 87/0; `check-doc4.ts` 189/0.
- A5 (shared-types ↔ UI contract) stays ⬜ until Doc-3 REST routes define final response envelopes; the UI types entities locally per app (`lib/types.ts`, hook modules) and re-points at `packages/shared-types` during integration.
- ⬜ Items needing a browser/device/CI runner (not runnable in-sandbox): §B auth interactions; §C permission gating live (two-window role change <2s); §D cache/optimistic rollback/keepPreviousData/realtime invalidation (network-tab + two-window); §E component interactions (drag-drop, CSV import, QR camera scan); §F public-form E2E + video upload + SSR visual; §G socket reconnect/auth rejection; §H a11y (keyboard/Lighthouse/VoiceOver); §I performance budgets (`next build`, Lighthouse, Profiler); §J sign-off (Storybook, Playwright, full QA script). J4 partial today: `tsc --noEmit` green per workspace; ESLint/component/E2E harnesses land with Doc-5 tooling.
