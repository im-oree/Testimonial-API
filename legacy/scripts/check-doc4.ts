/* eslint-disable no-console */
// ============================================================
// Doc 4 — "The Skin" frontend architecture: structural checklist.
// Run: npx tsx scripts/check-doc4.ts
//
// Static/structural evidence only (mirrors scripts/check-doc1.ts and
// check-doc2.ts). Behavioural evidence — realtime two-window sync,
// QR camera scans, Lighthouse, Storybook, Playwright E2E, VoiceOver —
// requires a browser/device/CI runner and is tracked in docs/04-skin.md
// as ⬜ items under the exact section letters (B–J).
// ============================================================
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const UI = join(ROOT, 'packages/ui/src');
const TENANT = join(ROOT, 'apps/web'); // single-website consolidation 2026-09-08
const PLATFORM = join(ROOT, 'apps/web'); // single-website consolidation 2026-09-08
const PUBLIC = join(ROOT, 'apps/web'); // single-website consolidation 2026-09-08

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(ok: boolean, label: string): void {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push(label);
    console.error(`  ✗ FAIL ${label}`);
  }
}

const read = (p: string): string => readFileSync(p, 'utf8');
const exists = (p: string): boolean => existsSync(p);
const file = (...parts: string[]): string => join(...parts);

/** Every listed file exists AND its content contains all needles. */
function fileChecks(base: string, list: Array<[string, string[]]>, header: string): void {
  console.log(header);
  for (const [rel, needles] of list) {
    const p = file(base, rel);
    if (!exists(p)) {
      check(false, `${rel} exists`);
      continue;
    }
    const src = read(p);
    if (needles.length === 0) {
      check(true, `${rel} exists`);
    } else {
      const missing = needles.filter((n) => !src.includes(n));
      check(missing.length === 0, `${rel} contains ${missing.length ? missing.join(' | ') : 'required markers'}`);
    }
  }
}

const CATALOG: Array<[string, string[]]> = [
  ['primitives', ['AppSelector', 'Avatar', 'Badge', 'Button', 'Card', 'Checkbox', 'CopyButton', 'Dialog', 'Divider', 'EmptyState', 'ErrorState', 'Input', 'Label', 'LoadingState', 'Select', 'Slider', 'Spinner', 'Switch', 'Tabs', 'Textarea', 'Tooltip']],
  ['layout', ['BulkActionBar', 'CodeBlock', 'ConfirmDialog', 'DestructiveConfirmDialog', 'ForbiddenPage', 'Header', 'ImpersonationBanner', 'PageContainer', 'Sidebar']],
  ['data-display', ['DataTable', 'FormBuilder', 'ImportCsvDialog', 'JsonViewer', 'QrCodeDisplay', 'RealtimeIndicator', 'StatCard', 'TagInput', 'TestimonialCard', 'TestimonialKanban', 'WidgetBuilder']],
  ['feedback', ['ChartCard', 'Toast', 'ToastViewport']],
  ['forms', ['ColorPicker', 'RatingInput', 'RichTextArea']],
  ['charts', ['AreaChartCard', 'BarChartCard', 'LineChartCard', 'PieChartCard']],
];

const TENANT_PAGES: Array<[string, string[]]> = [
  // Route-group reconciliation (2026-09-08): Next 15 App Router hard-errors
  // when two route groups both resolve to '/' — app/app/page.tsx and
  // app/(marketing)/page.tsx cannot coexist. '/' belongs to (marketing)
  // → /login; the dashboard's real index is /overview (spec §B login target),
  // so the redundant (dashboard) index stub was removed.
  ['app/layout.tsx', ['ReactQueryProvider']],
  ['app/login/page.tsx', ['/v1/auth/login', '/login/mfa', 'Google']],
  ['app/login/mfa/page.tsx', ['/v1/auth/mfa/verify']],
  ['app/onboarding/[token]/page.tsx', ['dynamic', 'OnboardingView']],
  ['app/onboarding/[token]/onboarding-view.tsx', ['/v1/auth/onboarding', 'token', 'password']],
  ['app/accept-invite/[token]/page.tsx', ['dynamic', 'AcceptInviteView']],
  ['app/accept-invite/[token]/accept-invite-view.tsx', ['/v1/auth/invites/accept']],
  ['app/app/layout.tsx', ['useMe', 'useRealtime', 'Sidebar', 'ImpersonationBanner', "router.replace('/login"]],
  ['app/app/overview/page.tsx', ['useDashboardOverview', 'StatCard']],
  ['app/app/testimonials/page.tsx', ['DataTable', 'BulkActionBar', 'ImportCsvDialog', 'useTestimonials']],
  ['app/app/testimonials/[id]/page.tsx', ['dynamic', 'TestimonialDetailView']],
  ['app/app/testimonials/[id]/testimonial-detail-view.tsx', ['useTestimonialDetail', 'DestructiveConfirmDialog']],
  ['app/app/testimonials/moderation/page.tsx', ['TestimonialKanban', 'useTestimonialMutations']],
  ['app/app/forms/page.tsx', ['useForms', 'DataTable']],
  ['app/app/forms/new/page.tsx', ['FormEditorView']],
  ['app/app/forms/[id]/page.tsx', ['dynamic', 'FormEditorView']],
  ['app/app/forms/form-editor-view.tsx', ['FormBuilder', 'useFormMutations']],
  ['app/app/widgets/page.tsx', ['useWidgets', 'CodeBlock']],
  ['app/app/widgets/new/page.tsx', ['WidgetEditorView']],
  ['app/app/widgets/[id]/page.tsx', ['dynamic', 'WidgetEditorView']],
  ['app/app/widgets/widget-editor-view.tsx', ['WidgetBuilder', 'useWidgetLivePreview', 'CodeBlock']],
  ['app/app/team/page.tsx', ['useTeamMutations', 'changeRole']],
  ['app/app/webhooks/page.tsx', ['useWebhooks', 'useWebhookDeliveries']],
  ['app/app/audit/page.tsx', ['useAuditLogs']],
  ['app/app/billing/page.tsx', ['useBilling']],
  ['app/app/settings/page.tsx', ['useApiKeys', 'ColorPicker']],
];

const PLATFORM_PAGES: Array<[string, string[]]> = [
  // Route-group reconciliation (2026-09-08): see note above TENANT_PAGES —
  // '/' belongs to (marketing) → /login; the (dashboard) index stub was
  // removed (dashboard index is /overview).
  ['app/layout.tsx', ['ReactQueryProvider']],
  ['app/login/page.tsx', ['/v1/platform/auth/login']],
  ['app/platform/layout.tsx', ['useMe', 'useRealtime', 'Sidebar', 'ImpersonationBanner', 'useImpersonationStore']],
  ['app/platform/overview/page.tsx', ['usePlatformOverview', 'StatCard']],
  ['app/platform/tenants/page.tsx', ['useTenants', 'DataTable']],
  ['app/platform/tenants/[id]/page.tsx', ['dynamic', 'TenantDetailView']],
  ['app/platform/tenants/[id]/tenant-detail-view.tsx', ['useTenantDetail', 'Impersonate', 'startImpersonation']],
  ['app/platform/tenants/[id]/staff/page.tsx', ['dynamic', 'TenantStaffView']],
  ['app/platform/tenants/[id]/staff/tenant-staff-view.tsx', ['useTenantStaff']],
  ['app/platform/tenants/[id]/settings/page.tsx', ['dynamic', 'TenantSettingsView']],
  ['app/platform/tenants/[id]/settings/tenant-settings-view.tsx', ['useTenantSettings', 'DestructiveConfirmDialog']],
  ['app/platform/staff/page.tsx', ['usePlatformStaff']],
  ['app/platform/billing/page.tsx', ['usePlatformBilling']],
  ['app/platform/webhooks/page.tsx', ['usePlatformWebhooks']],
  ['app/platform/audit/page.tsx', ['useAuditLogs']],
  ['app/platform/ai/page.tsx', ['useAiProviders', 'useAiTaskLogs', 'useAiCosts', 'Tabs']],
  ['app/platform/settings/page.tsx', ['Switch']],
];

const PUBLIC_PAGES: Array<[string, string[]]> = [
  ['app/layout.tsx', ['ReactQueryProvider']],
  ['app/page.tsx', ['/forms/demo']],
  ['app/forms/[slug]/page.tsx', ['force-dynamic', 'fetch(', 'PublicFormView', 'no-store']],
  ['app/forms/[slug]/public-form-view.tsx', ['/v1/public/forms/', 'LoadingState', 'ErrorState', 'EmptyState', 'RatingInput', 'video']],
  ['app/forms/[slug]/public-types.ts', ['PublicForm', 'brandColor', 'questions']],
  ['app/forms/[slug]/success/page.tsx', ['Thank you']],
];

// Every data-driven view must implement loading/empty/error states (Doc 4
// "a page with no empty state, loading state, error state is not done").
const DATA_VIEWS = [
  [TENANT, 'app/app/overview/page.tsx'],
  [TENANT, 'app/app/testimonials/page.tsx'],
  [TENANT, 'app/app/testimonials/[id]/testimonial-detail-view.tsx'],
  [TENANT, 'app/app/testimonials/moderation/page.tsx'],
  [TENANT, 'app/app/forms/page.tsx'],
  [TENANT, 'app/app/forms/form-editor-view.tsx'],
  [TENANT, 'app/app/widgets/page.tsx'],
  [TENANT, 'app/app/widgets/widget-editor-view.tsx'],
  [TENANT, 'app/app/team/page.tsx'],
  [TENANT, 'app/app/webhooks/page.tsx'],
  [TENANT, 'app/app/audit/page.tsx'],
  [TENANT, 'app/app/billing/page.tsx'],
  [TENANT, 'app/app/settings/page.tsx'],
  [PLATFORM, 'app/platform/overview/page.tsx'],
  [PLATFORM, 'app/platform/tenants/page.tsx'],
  [PLATFORM, 'app/platform/tenants/[id]/tenant-detail-view.tsx'],
  [PLATFORM, 'app/platform/tenants/[id]/staff/tenant-staff-view.tsx'],
  [PLATFORM, 'app/platform/tenants/[id]/settings/tenant-settings-view.tsx'],
  [PLATFORM, 'app/platform/staff/page.tsx'],
  [PLATFORM, 'app/platform/billing/page.tsx'],
  [PLATFORM, 'app/platform/webhooks/page.tsx'],
  [PLATFORM, 'app/platform/audit/page.tsx'],
  [PLATFORM, 'app/platform/ai/page.tsx'],
  [PUBLIC, 'app/forms/[slug]/public-form-view.tsx'],
];

const TENANT_HOOKS = ['use-dashboard-overview', 'use-testimonials', 'use-testimonial-detail', 'use-testimonial-mutations', 'use-testimonial-tags', 'use-testimonial-import', 'use-testimonial-export', 'use-forms', 'use-form-detail', 'use-form-mutations', 'use-form-stats', 'use-widgets', 'use-widget-detail', 'use-widget-mutations', 'use-widget-live-preview', 'use-team', 'use-team-mutations', 'use-webhooks', 'use-webhook-deliveries', 'use-audit-logs', 'use-api-keys', 'use-billing'];
const PLATFORM_HOOKS = ['use-platform-overview', 'use-tenants', 'use-tenant-detail', 'use-tenant-staff', 'use-tenant-settings', 'use-platform-staff', 'use-platform-billing', 'use-platform-audit-logs', 'use-ai-providers', 'use-ai-task-logs', 'use-ai-costs', 'use-platform-webhooks'];

function main(): void {
  console.log('Doc 4 — The Skin: structural checklist\n');

  // ---- A. Structural existence ------------------------------------------
  console.log('A. Structural existence');
  fileChecks(TENANT, TENANT_PAGES, '  A1. web route tree — tenant workspace (/app) + auth pages');
  fileChecks(PLATFORM, PLATFORM_PAGES, '  A2. web route tree — platform console (/platform) + auth');
  fileChecks(PUBLIC, PUBLIC_PAGES, '  A3. web route tree — public forms (SSR)');
  for (const [cat, names] of CATALOG) {
    const rows: Array<[string, string[]]> = names.map((n) => [`${n}.tsx`, []]);
    fileChecks(file(UI, 'components', cat), rows, `  A4. §6 component inventory — ${cat}/`);
  }
  fileChecks(
    file(UI, 'lib'),
    [
      ['query-keys.ts', ['queryKeys', 'testimonials', 'forms', 'widgets', 'me', 'as const']],
      ['api-client.ts', ['401', 'PERM_STALE', '/v1/auth/refresh', '_retried', 'invalidateQueries']],
      ['socket.ts', ["io(", "'/live'", 'autoConnect: false']],
    ],
    '  A5. ui lib — query-keys factory + api-client interceptors + socket singleton',
  );
  fileChecks(
    file(UI, 'hooks'),
    [
      ['use-realtime.ts', ['testimonial.new_pending', 'testimonial.status_changed', 'permissions_changed', 'session.revoked', 'reconnect', 'join']],
      ['use-me.ts', ['/v1/auth/me', 'requiresMfa']],
    ],
    '  A6. ui hooks — useRealtime event bridge + useMe',
  );
  fileChecks(
    UI,
    [
      ['components/providers.tsx', ['QueryClientProvider', 'setApiQueryClient']],
      ['components/ui.tsx', ['export * from', 'ReactQueryProvider']],
      ['index.ts', ['api-client', 'query-keys', 'socket', 'use-realtime', 'components/ui']],
    ],
    '  A7. ui package barrel + providers',
  );

  // ---- B. Auth flow shapes ----------------------------------------------
  console.log('B. Auth flow (structural; §B browser checks ⬜)');
  check(exists(file(TENANT, 'app/login/page.tsx')), 'tenant login page exists');
  check(exists(file(TENANT, 'app/login/mfa/page.tsx')), 'tenant MFA page exists');
  check(exists(file(TENANT, 'app/onboarding/[token]/page.tsx')), 'onboarding route exists');
  check(exists(file(TENANT, 'app/accept-invite/[token]/page.tsx')), 'accept-invite route exists');

  // ---- C. Permission gating / impersonation ------------------------------
  console.log('C. Permission gates + impersonation (structural)');
  const tLayout = read(file(TENANT, 'app/app/layout.tsx'));
  check(/permissions\.includes|permissions\.filter/.test(tLayout), 'tenant sidebar filters nav by permissions');
  check(tLayout.includes('ImpersonationBanner'), 'tenant layout renders impersonation banner when impersonating');
  const pStore = read(file(PLATFORM, 'stores/impersonation.store.ts'));
  check(pStore.includes('startImpersonation') && pStore.includes('endImpersonation'), 'impersonation store exposes start/end');
  const pLayout = read(file(PLATFORM, 'app/platform/layout.tsx'));
  check(pLayout.includes('endImpersonation') && pLayout.includes('me.refetch'), 'exiting impersonation refetches /me');

  // ---- D. Data fetching hooks --------------------------------------------
  console.log('D. §7 data hooks + tri-state views');
  for (const h of TENANT_HOOKS) check(exists(file(TENANT, 'hooks', `${h}.ts`)), `tenant hook ${h}.ts`);
  for (const h of PLATFORM_HOOKS) check(exists(file(PLATFORM, 'hooks', `${h}.ts`)), `platform hook ${h}.ts`);
  for (const [base, rel] of DATA_VIEWS) {
    const src = read(file(base, rel));
    check(
      src.includes('LoadingState') && src.includes('ErrorState') && (src.includes('EmptyState') || src.includes('empty-state')),
      `${rel.replace('app/(dashboard)/', '')} implements loading + error + empty states`,
    );
  }

  // ---- E. Realtime wiring -------------------------------------------------
  console.log('E. Realtime bridge (structural; two-window §D/§G ⬜)');
  const realtime = read(file(UI, 'hooks/use-realtime.ts'));
  for (const evt of ['testimonial.new_pending', 'testimonial.status_changed', 'permissions_changed', 'session.revoked', 'ai.task_completed']) {
    check(realtime.includes(evt), `useRealtime handles ${evt}`);
  }
  const layouts = [read(file(TENANT, 'app/app/layout.tsx')), read(file(PLATFORM, 'app/platform/layout.tsx'))];
  check(layouts.every((l) => l.includes('useRealtime(')), 'both dashboard layouts mount useRealtime');

  // ---- F. Upload/embed/import patterns ------------------------------------
  console.log('F. Upload / embed / import patterns (structural)');
  check(exists(file(TENANT, 'hooks/use-testimonial-import.ts')), 'CSV import hook exists');
  check(exists(file(TENANT, 'hooks/use-testimonial-export.ts')), 'CSV export hook exists');
  const widget = read(file(TENANT, 'app/app/widgets/widget-editor-view.tsx'));
  check(widget.includes('cdn.testimonialapi.com/widget.js'), 'widget embed snippet (script)');
  check(widget.includes('CodeBlock'), 'embed code block present');
  const fv = read(file(PUBLIC, 'app/forms/[slug]/public-form-view.tsx'));
  check(fv.includes('captchaToken'), 'hCaptcha token slot present');
  check(fv.includes('video') && fv.includes('signed-URL'), 'video-upload path referenced');

  // ---- Summary ------------------------------------------------------------
  console.log(`\nDoc 4 structural checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('Failures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main();
