-- ============================================================
-- TESTIMONIAL API — dev/demo seed data (idempotent)
-- Run after schema.sql. Safe to run MANY times: every row is
-- upserted on its natural/pk key, so re-running never duplicates
-- and never errors. Creates the platform owner, one demo tenant
-- with two apps, staff of each role, the 4-plan set, 4 templates,
-- a form+questions, a widget and testimonials in every moderation
-- state. Fixed UUIDs mirror scripts/seed-firestore.ts 1:1.
-- ============================================================

BEGIN;

-- ---- Plans --------------------------------------------------
INSERT INTO plans (id, tier, name, price_cents, max_apps, max_testimonials_per_month, max_seats, features, rate_limit_per_min)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'free',       'Free',       0,    1,   50,   1,   '{"ai_import":false,"custom_domain":false,"remove_branding":false}', 60),
  ('00000000-0000-0000-0000-000000000002', 'starter',    'Starter',    2900, 3,   500,  5,   '{"ai_import":false,"custom_domain":false,"remove_branding":false,"webhooks":true}', 300),
  ('00000000-0000-0000-0000-000000000003', 'pro',        'Pro',        9900, 10,  5000, 15,  '{"ai_import":true,"custom_domain":true,"remove_branding":true,"webhooks":true}', 1200),
  ('00000000-0000-0000-0000-000000000004', 'enterprise', 'Enterprise', 0,    -1,  -1,   -1,  '{"ai_import":true,"custom_domain":true,"remove_branding":true,"webhooks":true,"sso_saml":true,"custom_rate_limits":true}', 100000)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name, price_cents = EXCLUDED.price_cents, max_apps = EXCLUDED.max_apps,
  max_testimonials_per_month = EXCLUDED.max_testimonials_per_month, max_seats = EXCLUDED.max_seats,
  features = EXCLUDED.features, rate_limit_per_min = EXCLUDED.rate_limit_per_min;

-- ---- Users ---------------------------------------------------
INSERT INTO users (id, email, name, auth_provider, email_verified_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'platform@zojatech.local',  'Platform Owner', 'password', now()),
  ('00000000-0000-0000-0000-000000000011', 'owner@acme.example',       'Ada Obi',        'password', now()),
  ('00000000-0000-0000-0000-000000000012', 'admin@acme.example',       'Tunde Bakare',   'password', now()),
  ('00000000-0000-0000-0000-000000000013', 'support@acme.example',     'Chidi Nwosu',    'password', now()),
  ('00000000-0000-0000-0000-000000000014', 'reviewer@acme.example',    'Zainab Yusuf',   'password', now()),
  ('00000000-0000-0000-0000-000000000015', 'viewer@acme.example',      'Emeka Okafor',   'password', now())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

-- ---- Platform admin (owner) -----------------------------------
INSERT INTO platform_admins (id, user_id, role, permissions, status, two_factor_enabled)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'owner', '{"*"}', 'active', false)
ON CONFLICT (id) DO NOTHING;

-- ---- Demo tenant ----------------------------------------------
INSERT INTO tenants (id, name, slug, brand_color, custom_domain, plan, status, owner_email, apps_count, staff_count)
VALUES ('00000000-0000-0000-0000-000000000101', 'Acme Inc.', 'acme', '#4F46E5', 'testimonials.acme.example', 'pro', 'active', 'owner@acme.example', 2, 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand_color = EXCLUDED.brand_color,
  plan = EXCLUDED.plan, status = EXCLUDED.status, apps_count = EXCLUDED.apps_count, staff_count = EXCLUDED.staff_count;

-- ---- Tenant staff (one of every role) --------------------------
INSERT INTO tenant_staff (id, tenant_id, user_id, role, permissions, status, activated_at)
VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 'owner',       '{"*"}',                        'active', now()),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000012', 'admin',       '{"*"}',                        'active', now()),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000013', 'editor',      '{testimonial:approve,testimonial:create,testimonial:archive}', 'active', now()),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000014', 'contributor', '{testimonial:create}', 'active', now()),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000015', 'viewer',      '{}',                           'active', now())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- ---- Apps -----------------------------------------------------
INSERT INTO apps (id, public_id, tenant_id, name, status, quota_testimonials_per_month, allowed_origins)
VALUES
  ('00000000-0000-0000-0000-000000000201', 'app_demo_site_01', '00000000-0000-0000-0000-000000000101', 'Marketing Site', 'active', 1000, ARRAY['https://www.acme.example']),
  ('00000000-0000-0000-0000-000000000202', 'app_demo_site_02', '00000000-0000-0000-0000-000000000101', 'Mobile App',     'active', 1000, ARRAY['https://app.acme.example'])
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- Public keys only (plain_value safe by design). Secret keys: NEVER stored plain.
INSERT INTO api_keys (id, app_id, type, environment, key_prefix, plain_value, status)
VALUES
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000201', 'public', 'live', 'pk_live_demo01', 'pk_live_demo01_seed_only', 'active'),
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', 'public', 'test', 'pk_test_demo01', 'pk_test_demo01_seed_only', 'active'),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000202', 'public', 'live', 'pk_live_demo02', 'pk_live_demo02_seed_only', 'active')
ON CONFLICT (id) DO NOTHING;

-- ---- Templates (v1 launch set per README §14.2/14.3) ----------
INSERT INTO templates (id, type, name, description, is_premium, version, component_ref, status)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'widget', 'Carousel',        'Auto-playing horizontal slider',           false, 1, 'CarouselV1',   'active'),
  ('00000000-0000-0000-0000-000000000302', 'widget', 'Wall of Love',    'Masonry grid of cards',                    false, 1, 'WallV1',       'active'),
  ('00000000-0000-0000-0000-000000000303', 'widget', 'Spotlight',       'Single large centered testimonial',        false, 1, 'SpotlightV1',  'active'),
  ('00000000-0000-0000-0000-000000000304', 'form',   'Simple Star + Text', '1-step rating + textarea',             false, 1, 'SimpleFormV1', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- ---- Collection form + questions ------------------------------
INSERT INTO collection_forms (id, app_id, name, slug, template_id, status, collect_consent, submission_count)
VALUES ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201',
        'Post-purchase review', 'post-purchase-review', '00000000-0000-0000-0000-000000000304', 'active', true, 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO form_questions (id, form_id, type, label, required, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000401', 'rating',   'How likely are you to recommend us?', true, 0),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000401', 'textarea', 'Tell us about your experience',       true, 1)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- ---- Widget ----------------------------------------------------
INSERT INTO widgets (id, app_id, name, template_id, template_version, layout_type, filter_limit, is_published)
VALUES ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201',
        'Homepage carousel', '00000000-0000-0000-0000-000000000301', 1, 'carousel', 10, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_published = EXCLUDED.is_published;

-- ---- Testimonials (one per moderation state, plus archived) ------
INSERT INTO testimonials (id, app_id, author_name, author_title, author_company, author_email, message, rating, status, tags, fingerprint, consent_given, reviewed_by)
VALUES
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000201', 'Bola Adeyemi', 'CTO', 'Flux Inc',  'bola@flux.example',     'This tool saved us weeks of manual work.',          5, 'approved', ARRAY['onboarding'], 'fp_seed_01', true, '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000201', 'Ngozi Eze',    NULL, NULL,          'ngozi@example.com',     'Loved every minute of the setup.',                  5, 'approved', ARRAY['support'],    'fp_seed_02', true, '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000201', 'Kunle Ojo',    'PM', 'Bright Labs', 'kunle@bright.example',  'Great UX overall.',                                 4, 'pending',   ARRAY['pricing'],    'fp_seed_03', true, NULL),
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000201', 'Aisha Bello',  NULL, NULL,          'aisha@example.com',     'Spam-looking reference.',                           1, 'rejected',  ARRAY['spam'],      'fp_seed_04', true, '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000201', 'Yemi Alade',   'CEO', 'Nova Ltd',    'yemi@nova.example',     'A previous campaign quote we kept on file.',        5, 'archived',  ARRAY['campaign'],  'fp_seed_05', true, '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000606', '00000000-0000-0000-0000-000000000201', 'Sola Adebayo', NULL, NULL,          'sola@example.com',      'Amazing support and fast setup.',                   5, 'approved',  ARRAY['support'],   'fp_seed_06', true, '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000201', 'Chioma Nnamdi',NULL, NULL,          'chioma@example.com',    'The API was a joy to integrate.',                   5, 'approved',  ARRAY['api'],       'fp_seed_07', true, '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000608', '00000000-0000-0000-0000-000000000201', 'Ibrahim Musa', NULL, NULL,          'ibrahim@example.com',   'Would love to see more export options.',            3, 'pending',   ARRAY['feature'],   'fp_seed_08', true, NULL),
  ('00000000-0000-0000-0000-000000000609', '00000000-0000-0000-0000-000000000202', 'Fatima Sani',  'VP', 'Kano Systems', 'fatima@kano.example',   'Great widget for our landing page.',                4, 'approved',  ARRAY['widget'],    'fp_seed_09', true, '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000610', '00000000-0000-0000-0000-000000000202', 'Dapo Ogun',    NULL, NULL,          'dapo@example.com',      'Second app review — automation is solid.',          4, 'approved',  ARRAY['api'],       'fp_seed_10', true, '00000000-0000-0000-0000-000000000013'),
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000202', 'Halima Bello', NULL, NULL,          'halima@example.com',    'Referral UI could be clearer.',                     2, 'rejected',  ARRAY['ux'],        'fp_seed_11', true, '00000000-0000-0000-0000-000000000013')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, author_name = EXCLUDED.author_name;

-- ---- AI providers (mock only — real providers added via dashboard) ----
INSERT INTO ai_providers (id, name, type, status, api_key_encrypted, default_model, max_tokens_per_request, rate_limit_per_minute, rate_limit_per_day, cost_per_input_token, cost_per_output_token, priority, is_fallback, settings)
VALUES (
  '00000000-0000-0000-0000-00000000a101', 'Mock (dev)',
  'mock', 'active', 'mock://none', 'mock-1', 1024, 100000, 1000000, 0, 0, 1, false,
  '{"temperature":0.0}'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- ---- AI task configs (safe defaults; classify NEVER auto-approves) ----
INSERT INTO ai_task_configs (id, task_type, name, prompt_template, response_schema, routing_strategy, provider_ids, provider_weights, confidence_threshold, auto_approve_threshold, max_retries, timeout_ms, cache_ttl_seconds, is_active)
VALUES
  ('00000000-0000-0000-0000-00000000a201', 'classify_testimonial', 'Classify social mention',
   $$You are reviewing a social media post about '{{brandName}}'. Determine if this is a genuine positive customer testimonial. Return strict JSON: { "isGenuineTestimonial": bool, "isSpam": bool, "sentimentScore": number 1-5, "cleanedQuote": string, "confidence": number 0-1, "language": string }. Post: """{{text}}"""$$,
   '{"type":"object"}', 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.75, NULL, 2, 10000, 3600, true),
  ('00000000-0000-0000-0000-00000000a202', 'detect_spam', 'Spam / fake detection',
   $$Is this user-submitted testimonial spam, fake, or AI-generated? Return JSON: { "isSpam": bool, "confidence": number 0-1, "reason": string }. Testimonial: """{{text}}""" Author: {{authorName}}$$,
   '{"type":"object"}', 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.80, 0.95, 2, 10000, 60, true),
  ('00000000-0000-0000-0000-00000000a203', 'extract_sentiment', 'Sentiment + rating extraction',
   $$Extract sentiment and a 1-5 star rating from this customer message. Return JSON: { "sentimentScore": number 1-5, "confidence": number 0-1 }. Message: """{{text}}"""$$,
   '{"type":"object"}', 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.70, 0.85, 2, 10000, 300, true),
  ('00000000-0000-0000-0000-00000000a204', 'translate', 'Translate testimonial',
   $$Translate the following testimonial into {{targetLanguage}}. Return ONLY the translation, no commentary. Testimonial: """{{text}}"""$$,
   NULL, 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.60, 0.80, 2, 15000, 86400, true),
  ('00000000-0000-0000-0000-00000000a205', 'summarize', 'Summarize testimonial',
   $$Summarize this testimonial into a single concise sentence suitable for display. Return JSON: { "summary": string, "confidence": number 0-1 }. Testimonial: """{{text}}"""$$,
   '{"type":"object"}', 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.65, NULL, 2, 10000, 3600, true),
  ('00000000-0000-0000-0000-00000000a206', 'generate_reply', 'Draft a thank-you reply',
   $$Draft a short, warm thank-you reply to this customer testimonial. Return JSON: { "reply": string, "confidence": number 0-1 }. Testimonial: """{{text}}"""$$,
   '{"type":"object"}', 'failover', ARRAY['00000000-0000-0000-0000-00000000a101'], '{}', 0.65, NULL, 2, 10000, 60, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active,
  prompt_template = EXCLUDED.prompt_template, confidence_threshold = EXCLUDED.confidence_threshold;

-- ---- App stats read-model --------------------------------------
INSERT INTO app_stats (app_id, total_testimonials, approved_count, pending_count, avg_rating, by_source, by_month)
VALUES
  ('00000000-0000-0000-0000-000000000201', 8, 4, 2, 4.63, '{"manual":8}', '{}'),
  ('00000000-0000-0000-0000-000000000202', 3, 2, 0, 3.33, '{"manual":3}', '{}')
ON CONFLICT (app_id) DO UPDATE SET
  total_testimonials = EXCLUDED.total_testimonials, approved_count = EXCLUDED.approved_count,
  pending_count = EXCLUDED.pending_count, avg_rating = EXCLUDED.avg_rating;

-- ---- Audit log samples (current + previous month partitions) ----
INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, tenant_id, metadata)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'tenant_staff', 'tenant.login', 'tenant', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', '{}'),
  ('00000000-0000-0000-0000-000000000011', 'tenant_staff', 'testimonial.approve', 'testimonial', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000101', '{"appId":"00000000-0000-0000-0000-000000000201"}')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, tenant_id, metadata, created_at)
SELECT '00000000-0000-0000-0000-000000000013', 'tenant_staff', 'testimonial.reject', 'testimonial', '00000000-0000-0000-0000-000000000604',
       '00000000-0000-0000-0000-000000000101', '{"appId":"00000000-0000-0000-0000-000000000201"}',
       (date_trunc('month', now()) - INTERVAL '1 day')::TIMESTAMPTZ
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs WHERE id = 2 AND action = 'testimonial.reject'
);

COMMIT;
