/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// Seed the Firestore EMULATOR with the same demo dataset as
// infra/postgres/seed.sql (fixed doc ids == fixed SQL UUIDs so a
// migration rehearsal compares 1:1). Idempotent: doc ids are
// deterministic, re-running overwrites in place.
//
//   npm run emulators          (terminal 1 — firestore + pubsub)
//   npx tsx scripts/seed-firestore.ts   (terminal 2)
//
// Requires FIRESTORE_EMULATOR_HOST (set automatically by the
// firebase emulator when you run it from this repo, or export it).
// ============================================================
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; // firebase.json default
}
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = 'demo-testimonial';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = admin.firestore();
const now = Timestamp.now();

type Doc = { [key: string]: unknown };

async function set(col: string, id: string, data: Doc): Promise<void> {
  await db.collection(col).doc(id).set(data, { merge: true });
}

async function main(): Promise<void> {
  const P = '00000000-0000-0000-0000-0000000000';
  const u = (n: number) => `${P}${String(n).padStart(2, '0')}`;

  // ---- Plans -------------------------------------------------
  const plans: Array<[string, Doc]> = [
    ['00000000-0000-0000-0000-000000000001', { tier: 'free', name: 'Free', priceCents: 0, maxApps: 1, maxTestimonialsPerMonth: 50, maxSeats: 1, features: { aiImport: false, customDomain: false, removeBranding: false }, rateLimitPerMin: 60 }],
    ['00000000-0000-0000-0000-000000000002', { tier: 'starter', name: 'Starter', priceCents: 2900, maxApps: 3, maxTestimonialsPerMonth: 500, maxSeats: 5, features: { aiImport: false, customDomain: false, removeBranding: false, webhooks: true }, rateLimitPerMin: 300 }],
    ['00000000-0000-0000-0000-000000000003', { tier: 'pro', name: 'Pro', priceCents: 9900, maxApps: 10, maxTestimonialsPerMonth: 5000, maxSeats: 15, features: { aiImport: true, customDomain: true, removeBranding: true, webhooks: true }, rateLimitPerMin: 1200 }],
    ['00000000-0000-0000-0000-000000000004', { tier: 'enterprise', name: 'Enterprise', priceCents: 0, maxApps: -1, maxTestimonialsPerMonth: -1, maxSeats: -1, features: { aiImport: true, customDomain: true, removeBranding: true, webhooks: true, ssoSaml: true, customRateLimits: true }, rateLimitPerMin: 100000 }],
  ];
  for (const [id, data] of plans) await set('plans', id, { createdAt: now, updatedAt: now, ...data });

  // ---- Users -------------------------------------------------
  const users: Array<[string, Doc]> = [
    [u(10), { email: 'platform@zojatech.local', name: 'Platform Owner', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
    [u(11), { email: 'owner@acme.example', name: 'Ada Obi', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
    [u(12), { email: 'admin@acme.example', name: 'Tunde Bakare', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
    [u(13), { email: 'support@acme.example', name: 'Chidi Nwosu', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
    [u(14), { email: 'reviewer@acme.example', name: 'Zainab Yusuf', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
    [u(15), { email: 'viewer@acme.example', name: 'Emeka Okafor', authProvider: 'password', mfaEnabled: false, emailVerifiedAt: now }],
  ];
  for (const [id, data] of users) await set('users', id, { createdAt: now, updatedAt: now, ...data });

  await set('platformAdmins', '00000000-0000-0000-0000-000000000020', {
    userId: u(10), role: 'owner', permissions: ['*'], status: 'active', twoFactorEnabled: false, createdAt: now,
  });

  // ---- Tenant -------------------------------------------------
  const TENANT = '00000000-0000-0000-0000-000000000101';
  await set('tenants', TENANT, {
    name: 'Acme Inc.', slug: 'acme', logoUrl: null, brandColor: '#4F46E5',
    customDomain: 'testimonials.acme.example', customDomainVerified: false,
    plan: 'pro', status: 'active', ownerEmail: 'owner@acme.example',
    stripeCustomerId: null, currentPeriodEnd: null, deletedAt: null,
    testimonialsThisMonth: 0, appsCount: 2, staffCount: 5, createdAt: now, updatedAt: now,
  });

  const staff: Array<[string, string, string, string[]]> = [
    ['00000000-0000-0000-0000-000000000030', u(11), 'owner', ['*']],
    ['00000000-0000-0000-0000-000000000031', u(12), 'admin', ['*']],
    ['00000000-0000-0000-0000-000000000032', u(13), 'editor', ['testimonial:approve', 'testimonial:create', 'testimonial:archive']],
    ['00000000-0000-0000-0000-000000000033', u(14), 'contributor', ['testimonial:create']],
    ['00000000-0000-0000-0000-000000000034', u(15), 'viewer', []],
  ];
  for (const [id, userId, role, permissions] of staff) {
    await set('tenantStaff', id, {
      tenantId: TENANT, userId, role, permissions, status: 'active',
      invitedAt: now, activatedAt: now, lastLoginAt: null,
    });
  }

  // ---- Apps + public keys ------------------------------------
  const APP1 = '00000000-0000-0000-0000-000000000201';
  const APP2 = '00000000-0000-0000-0000-000000000202';
  const mkApp = (id: string, publicId: string, name: string, origins: string[]): Doc => ({
    publicId, tenantId: TENANT, name, description: null, status: 'active',
    quotaTestimonialsPerMonth: 1000, quotaWidgetsMax: 3, quotaFormsMax: 3, quotaSeatMax: 5,
    allowedOrigins: origins, ipAllowList: null, requireCaptchaOnForms: true,
    archivedAt: null, createdAt: now, updatedAt: now,
  });
  await set('apps', APP1, mkApp(APP1, 'app_demo_site_01', 'Marketing Site', ['https://www.acme.example']));
  await set('apps', APP2, mkApp(APP2, 'app_demo_site_02', 'Mobile App', ['https://app.acme.example']));

  const keys: Array<[string, string, string, string]> = [
    ['00000000-0000-0000-0000-000000000210', APP1, 'pk_live_demo01', 'pk_live_demo01_seed_only'],
    ['00000000-0000-0000-0000-000000000211', APP1, 'pk_test_demo01', 'pk_test_demo01_seed_only'],
    ['00000000-0000-0000-0000-000000000212', APP2, 'pk_live_demo02', 'pk_live_demo02_seed_only'],
  ];
  for (const [id, appId, prefix, plain] of keys) {
    await set('apiKeys', id, {
      appId, type: 'public', environment: 'live', keyPrefix: prefix,
      keyHash: null, plainValue: plain, status: 'active', version: 1,
      revokedAt: null, lastUsedAt: null, createdAt: now,
    });
  }

  // ---- Templates ---------------------------------------------
  const templates: Array<[string, string, string, string]> = [
    ['00000000-0000-0000-0000-000000000301', 'widget', 'Carousel', 'CarouselV1'],
    ['00000000-0000-0000-0000-000000000302', 'widget', 'Wall of Love', 'WallV1'],
    ['00000000-0000-0000-0000-000000000303', 'widget', 'Spotlight', 'SpotlightV1'],
    ['00000000-0000-0000-0000-000000000304', 'form', 'Simple Star + Text', 'SimpleFormV1'],
  ];
  for (const [id, type, name, comp] of templates) {
    await set('templates', id, { type, name, description: null, previewImageUrl: null, isPremium: false, version: 1, configSchema: [], componentRef: comp, status: 'active', createdAt: now, updatedAt: now });
  }

  // ---- Form + questions --------------------------------------
  const FORM = '00000000-0000-0000-0000-000000000401';
  await set('collectionForms', FORM, {
    appId: APP1, name: 'Post-purchase review', slug: 'post-purchase-review',
    templateId: '00000000-0000-0000-0000-000000000304', status: 'active', ratingType: 'star5',
    collectVideo: false, collectConsent: true, redirectUrlOnSuccess: null,
    styleOverrides: {}, submissionCount: 4, draft: false, createdAt: now, updatedAt: now,
  });
  await set('formQuestions', '00000000-0000-0000-0000-000000000410', {
    formId: FORM, type: 'rating', label: 'How likely are you to recommend us?', required: true, options: null, sortOrder: 0,
  });
  await set('formQuestions', '00000000-0000-0000-0000-000000000411', {
    formId: FORM, type: 'textarea', label: 'Tell us about your experience', required: true, options: null, sortOrder: 1,
  });

  // ---- Widget ------------------------------------------------
  await set('widgets', '00000000-0000-0000-0000-000000000501', {
    appId: APP1, name: 'Homepage carousel', templateId: '00000000-0000-0000-0000-000000000301',
    templateVersion: 1, layoutType: 'carousel', filterTags: [], filterMinRating: null,
    filterFeaturedOnly: false, filterLimit: 10, styleOverrides: {}, embedType: 'script',
    isPublished: true, createdAt: now, updatedAt: now,
  });

  // ---- Testimonials ------------------------------------------
  const APPROVED_BY = u(11);
  const REJECTED_BY = u(12);
  const t = (
    id: string, appId: string, authorName: string, authorTitle: string | null, authorCompany: string | null,
    authorEmail: string | null, message: string, rating: number | null, status: string, tags: string[],
    fingerprint: string, reviewedBy: string | null,
  ): void => {
    void set('testimonials', id, {
      appId, environment: 'live', authorName, authorTitle, authorCompany,
      authorAvatarUrl: null, authorEmail, message, rating, ratingType: 'star5',
      mediaUrls: [], videoUrl: null, source: 'manual', sourceRef: null,
      status, reviewedBy, reviewedAt: reviewedBy ? now : null, rejectionReason: null,
      tags, featured: false, sortOrder: 0, customFields: {}, fingerprint,
      language: 'en', consentGiven: true, deletedAt: null, createdAt: now, updatedAt: now,
    });
  };
  const rows: Array<[string, string, string, string | null, string | null, string | null, string, number | null, string, string[], string, string | null]> = [
    ['00000000-0000-0000-0000-000000000601', APP1, 'Bola Adeyemi', 'CTO', 'Flux Inc', 'bola@flux.example', 'This tool saved us weeks of manual work.', 5, 'approved', ['onboarding'], 'fp_seed_01', APPROVED_BY],
    ['00000000-0000-0000-0000-000000000602', APP1, 'Ngozi Eze', null, null, 'ngozi@example.com', 'Loved every minute of the setup.', 5, 'approved', ['support'], 'fp_seed_02', APPROVED_BY],
    ['00000000-0000-0000-0000-000000000603', APP1, 'Kunle Ojo', 'PM', 'Bright Labs', 'kunle@bright.example', 'Great UX overall.', 4, 'pending', ['pricing'], 'fp_seed_03', null],
    ['00000000-0000-0000-0000-000000000604', APP1, 'Aisha Bello', null, null, 'aisha@example.com', 'Spam-looking reference.', 1, 'rejected', ['spam'], 'fp_seed_04', REJECTED_BY],
    ['00000000-0000-0000-0000-000000000605', APP1, 'Yemi Alade', 'CEO', 'Nova Ltd', 'yemi@nova.example', 'A previous campaign quote we kept on file.', 5, 'archived', ['campaign'], 'fp_seed_05', REJECTED_BY],
    ['00000000-0000-0000-0000-000000000606', APP1, 'Sola Adebayo', null, null, 'sola@example.com', 'Amazing support and fast setup.', 5, 'approved', ['support'], 'fp_seed_06', APPROVED_BY],
    ['00000000-0000-0000-0000-000000000607', APP1, 'Chioma Nnamdi', null, null, 'chioma@example.com', 'The API was a joy to integrate.', 5, 'approved', ['api'], 'fp_seed_07', APPROVED_BY],
    ['00000000-0000-0000-0000-000000000608', APP1, 'Ibrahim Musa', null, null, 'ibrahim@example.com', 'Would love to see more export options.', 3, 'pending', ['feature'], 'fp_seed_08', null],
    ['00000000-0000-0000-0000-000000000609', APP2, 'Fatima Sani', 'VP', 'Kano Systems', 'fatima@kano.example', 'Great widget for our landing page.', 4, 'approved', ['widget'], 'fp_seed_09', APPROVED_BY],
    ['00000000-0000-0000-0000-000000000610', APP2, 'Dapo Ogun', null, null, 'dapo@example.com', 'Second app review — automation is solid.', 4, 'approved', ['api'], 'fp_seed_10', u(13)],
    ['00000000-0000-0000-0000-000000000611', APP2, 'Halima Bello', null, null, 'halima@example.com', 'Referral UI could be clearer.', 2, 'rejected', ['ux'], 'fp_seed_11', u(13)],
  ];
  for (const r of rows) t(...r);

  // ---- App stats ----------------------------------------------
  await set('appStats', APP1, {
    totalTestimonials: 8, approvedCount: 4, pendingCount: 2, avgRating: 4.63,
    bySource: { manual: 8 }, byMonth: {}, updatedAt: now,
  });
  await set('appStats', APP2, {
    totalTestimonials: 3, approvedCount: 2, pendingCount: 0, avgRating: 3.33,
    bySource: { manual: 3 }, byMonth: {}, updatedAt: now,
  });

  // ---- AI engine (Doc 2 Additive A): 1 mock provider + 6 default task
  // configs — doc ids mirror infra/postgres/seed.sql so migration rehearsal
  // compares 1:1. classify_testimonial autoApproveThreshold is null (never
  // auto-publish) — mirrored exactly. --------------------------------
  await set('aiProviders', '00000000-0000-0000-0000-00000000a101', {
    name: 'Mock (dev)', type: 'mock', status: 'active', apiKeyEncrypted: 'mock://none',
    baseUrl: null, defaultModel: 'mock-1', maxTokensPerRequest: 1024,
    rateLimitPerMinute: 100000, rateLimitPerDay: 1000000,
    costPerInputToken: 0, costPerOutputToken: 0, priority: 1, isFallback: false,
    settings: { temperature: 0 }, consecutiveFailures: 0, createdAt: now, updatedAt: now,
  });

  const MOCK_PROV = '00000000-0000-0000-0000-00000000a101';
  const taskConfigs: Array<[string, string, string, string, number | null, number, number]> = [
    ['00000000-0000-0000-0000-00000000a201', 'classify_testimonial', 'Classify social mention', 'You are reviewing a social media post about {{brandName}}. Determine if this is a genuine positive customer testimonial. Return strict JSON: { isGenuineTestimonial, isSpam, sentimentScore, cleanedQuote, confidence, language }. Post: """{{text}}"""', null, 0.75, 3600],
    ['00000000-0000-0000-0000-00000000a202', 'detect_spam', 'Spam / fake detection', 'Is this user-submitted testimonial spam, fake, or AI-generated? Return JSON: { isSpam, confidence, reason }. Testimonial: """{{text}}""" Author: {{authorName}}', 0.95, 0.8, 60],
    ['00000000-0000-0000-0000-00000000a203', 'extract_sentiment', 'Sentiment + rating extraction', 'Extract sentiment and a 1-5 star rating from this customer message. Return JSON: { sentimentScore, confidence }. Message: """{{text}}"""', 0.85, 0.7, 300],
    ['00000000-0000-0000-0000-00000000a204', 'translate', 'Translate testimonial', 'Translate the following testimonial into {{targetLanguage}}. Return ONLY the translation, no commentary. Testimonial: """{{text}}"""', null, 0.6, 86400],
    ['00000000-0000-0000-0000-00000000a205', 'summarize', 'Summarize testimonial', 'Summarize this testimonial into a single concise sentence suitable for display. Return JSON: { summary, confidence }. Testimonial: """{{text}}"""', null, 0.65, 3600],
    ['00000000-0000-0000-0000-00000000a206', 'generate_reply', 'Draft a thank-you reply', 'Draft a short, warm thank-you reply to this customer testimonial. Return JSON: { reply, confidence }. Testimonial: """{{text}}"""', null, 0.65, 60],
  ];
  for (const [id, taskType, name, promptTemplate, auto, conf, ttl] of taskConfigs) {
    await set('aiTaskConfigs', id, {
      taskType, name, promptTemplate, responseSchema: auto === null && /translate/.test(taskType) ? null : { type: 'object' },
      routingStrategy: 'failover', providerIds: [MOCK_PROV], providerWeights: {},
      confidenceThreshold: conf, autoApproveThreshold: auto, maxRetries: 2, timeoutMs: 10000,
      cacheTtlSeconds: ttl, isActive: true, createdAt: now, updatedAt: now,
    });
  }

  // ---- Audit log samples ---------------------------------------
  await set('auditLogs', '00000000-0000-0000-0000-000000000901', {
    actorId: u(11), actorType: 'tenant_staff', actorLabel: null, action: 'tenant.login',
    targetType: 'tenant', targetId: TENANT, tenantId: TENANT, ip: null, userAgent: null,
    metadata: {}, createdAt: now,
  });
  await set('auditLogs', '00000000-0000-0000-0000-000000000902', {
    actorId: u(11), actorType: 'tenant_staff', actorLabel: null, action: 'testimonial.approve',
    targetType: 'testimonial', targetId: '00000000-0000-0000-0000-000000000601', tenantId: TENANT,
    ip: null, userAgent: null, metadata: { appId: APP1 }, createdAt: now,
  });

  console.log('[seed-firestore] done — 11 testimonials, 2 apps, 5 staff, 4 plans, 4 templates seeded.');
  await admin.app().delete();
}

main().catch((err) => {
  console.error('[seed-firestore] failed:', err);
  process.exitCode = 1;
});
