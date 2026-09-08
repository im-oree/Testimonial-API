-- ============================================================
-- TESTIMONIAL API — canonical PostgreSQL schema (production target)
-- Source of truth: docs/01-skeleton.md §6
-- Keep in sync with: apps/api/src/infrastructure/database/postgres/schema.prisma
--                     packages/domain/entities/*.ts
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy/full-text search
CREATE EXTENSION IF NOT EXISTS "citext";        -- case-insensitive text (email/slug)

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE tenant_status AS ENUM ('active','suspended','pending_setup');
CREATE TYPE plan_tier AS ENUM ('free','starter','pro','enterprise');
CREATE TYPE tenant_role AS ENUM ('owner','admin','editor','contributor','viewer');
CREATE TYPE platform_role AS ENUM ('owner','admin','support','billing','developer','read_only');
CREATE TYPE staff_status AS ENUM ('invited','active','disabled');
CREATE TYPE app_status AS ENUM ('active','disabled');
CREATE TYPE api_key_type AS ENUM ('public','secret');
CREATE TYPE api_key_env AS ENUM ('live','test');
CREATE TYPE api_key_status AS ENUM ('active','revoked','expired');
CREATE TYPE testimonial_source AS ENUM ('manual','form','api','twitter_import','csv_import');
CREATE TYPE testimonial_status AS ENUM ('pending','approved','rejected','archived');
CREATE TYPE rating_type AS ENUM ('star5','nps','thumbs','none');
CREATE TYPE template_type AS ENUM ('widget','form');
CREATE TYPE widget_layout AS ENUM ('carousel','grid','wall','spotlight','badge','video_wall');
CREATE TYPE form_status AS ENUM ('draft','active','paused');
CREATE TYPE question_type AS ENUM ('text','textarea','rating','video','photo','select');
CREATE TYPE integration_provider AS ENUM ('twitter','google_reviews','producthunt','slack','zapier','webhook');
CREATE TYPE integration_status AS ENUM ('connected','error','disabled');
CREATE TYPE webhook_status AS ENUM ('active','disabled');
CREATE TYPE delivery_status AS ENUM ('pending','success','failed','retrying');
CREATE TYPE invite_scope AS ENUM ('platform','tenant');
CREATE TYPE actor_type AS ENUM ('platform_admin','tenant_staff','api_key','system');
CREATE TYPE auth_provider AS ENUM ('password','google','magic_link');

-- AI Service Engine (Doc 2 Additive A)
CREATE TYPE ai_provider_type AS ENUM ('openai','groq','gemini','anthropic','azure_openai','custom','mock');
CREATE TYPE ai_provider_status AS ENUM ('active','disabled','rate_limited','error');
CREATE TYPE ai_task_type AS ENUM ('classify_testimonial','summarize','translate','extract_sentiment','detect_spam','generate_reply','custom');
CREATE TYPE ai_routing_strategy AS ENUM ('round_robin','weighted','failover','cheapest','fastest','single');
CREATE TYPE ai_request_status AS ENUM ('success','error','timeout','rate_limited','low_confidence','human_override');

-- ============================================================
-- IDENTITY
-- ============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 CITEXT UNIQUE NOT NULL,
  password_hash         TEXT,
  name                  TEXT NOT NULL,
  avatar_url            TEXT,
  auth_provider         auth_provider NOT NULL DEFAULT 'password',
  mfa_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_encrypted  TEXT,
  email_verified_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users USING btree (email);

-- ============================================================
-- PLATFORM
-- ============================================================
CREATE TABLE platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          platform_role NOT NULL DEFAULT 'read_only',
  permissions   TEXT[] NOT NULL DEFAULT '{}',
  status        staff_status NOT NULL DEFAULT 'invited',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,      -- historical: who invited (may be deleted)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier              plan_tier UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  price_cents       INTEGER NOT NULL DEFAULT 0,
  max_apps          INTEGER NOT NULL,
  max_testimonials_per_month INTEGER NOT NULL,
  max_seats         INTEGER NOT NULL,
  features          JSONB NOT NULL DEFAULT '{}',   -- { ai_import: true, custom_domain: true, ... }
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  CITEXT UNIQUE NOT NULL,
  logo_url              TEXT,
  brand_color           TEXT NOT NULL DEFAULT '#4F46E5',
  custom_domain         TEXT UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  plan                  plan_tier NOT NULL DEFAULT 'free',
  status                tenant_status NOT NULL DEFAULT 'pending_setup',
  owner_email           CITEXT NOT NULL,
  stripe_customer_id    TEXT,
  current_period_end    TIMESTAMPTZ,
  testimonials_this_month INTEGER NOT NULL DEFAULT 0,
  apps_count            INTEGER NOT NULL DEFAULT 0,
  staff_count           INTEGER NOT NULL DEFAULT 0,
  deleted_at            TIMESTAMPTZ,               -- soft delete
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_slug ON tenants(slug);

CREATE TABLE tenant_staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          tenant_role NOT NULL DEFAULT 'viewer',
  permissions   TEXT[] NOT NULL DEFAULT '{}',
  status        staff_status NOT NULL DEFAULT 'invited',
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at  TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_staff_tenant ON tenant_staff(tenant_id);
CREATE INDEX idx_tenant_staff_user ON tenant_staff(user_id);

-- ============================================================
-- APPS
-- ============================================================
CREATE TABLE apps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id             TEXT UNIQUE NOT NULL,        -- "app_7c1e9b" — used in embeds
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  status                app_status NOT NULL DEFAULT 'active',
  quota_testimonials_per_month INTEGER NOT NULL DEFAULT 50,
  quota_widgets_max     INTEGER NOT NULL DEFAULT 3,
  quota_forms_max       INTEGER NOT NULL DEFAULT 3,
  quota_seat_max        INTEGER NOT NULL DEFAULT 5,
  allowed_origins       TEXT[] NOT NULL DEFAULT '{}',
  ip_allow_list         TEXT[],
  require_captcha_on_forms BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_apps_tenant ON apps(tenant_id) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX idx_apps_public_id ON apps(public_id);

CREATE TABLE api_keys (
  -- api_keys is a SEPARATE table (not columns on apps) so every rotation
  -- leaves an auditable row: version increments, old secrets stay revoked
  -- records, and a future hash-algorithm migration touches only this table.
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  type          api_key_type NOT NULL,
  environment   api_key_env NOT NULL,
  key_prefix    TEXT NOT NULL,                       -- first 12 chars, for UI display
  key_hash      TEXT,                                -- argon2, secret keys only
  plain_value   TEXT,                                -- public keys only (safe to store plain)
  status        api_key_status NOT NULL DEFAULT 'active',
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ
);
CREATE INDEX idx_api_keys_app ON api_keys(app_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE key_hash IS NOT NULL;
CREATE INDEX idx_api_keys_plain ON api_keys(plain_value) WHERE plain_value IS NOT NULL;

-- ============================================================
-- TESTIMONIALS
-- ============================================================
CREATE TABLE testimonials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  environment       api_key_env NOT NULL DEFAULT 'live',
  author_name       TEXT NOT NULL,
  author_title      TEXT,
  author_company    TEXT,
  author_avatar_url TEXT,
  author_email      TEXT,
  message           TEXT NOT NULL,
  rating            SMALLINT CHECK (rating BETWEEN 1 AND 5),
  rating_type       rating_type NOT NULL DEFAULT 'star5',
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  video_url         TEXT,
  source            testimonial_source NOT NULL DEFAULT 'manual',
  source_ref        TEXT,
  status            testimonial_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,  -- historical moderation reference
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  custom_fields     JSONB NOT NULL DEFAULT '{}',
  fingerprint       TEXT NOT NULL,
  language          TEXT,
  consent_given     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_testimonials_app_status ON testimonials(app_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_testimonials_featured ON testimonials(app_id, featured, sort_order);
CREATE INDEX idx_testimonials_tags ON testimonials USING GIN (tags);
CREATE INDEX idx_testimonials_fingerprint ON testimonials(app_id, fingerprint);
CREATE INDEX idx_testimonials_search ON testimonials USING GIN (message gin_trgm_ops);
CREATE UNIQUE INDEX idx_testimonials_dedupe ON testimonials(app_id, fingerprint) WHERE deleted_at IS NULL;

-- ============================================================
-- TEMPLATES (platform-managed, global)
-- ============================================================
CREATE TABLE templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              template_type NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  preview_image_url TEXT,
  is_premium        BOOLEAN NOT NULL DEFAULT FALSE,
  version           INTEGER NOT NULL DEFAULT 1,
  config_schema     JSONB NOT NULL DEFAULT '[]',
  component_ref     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COLLECTION FORMS
-- ============================================================
CREATE TABLE collection_forms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  template_id       UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT, -- platform asset; deletion only when unused
  status            form_status NOT NULL DEFAULT 'draft',
  rating_type       rating_type NOT NULL DEFAULT 'star5',
  collect_video     BOOLEAN NOT NULL DEFAULT FALSE,
  collect_consent   BOOLEAN NOT NULL DEFAULT TRUE,
  redirect_url_on_success TEXT,
  style_overrides   JSONB NOT NULL DEFAULT '{}',
  submission_count  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(app_id, slug)
);

CREATE TABLE form_questions (
  -- Questions are NORMALIZED rows (not a JSON blob on collection_forms) so
  -- they can be indexed, ordered and paginated independently at scale, and
  -- a form's question set is versioned per row.
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id       UUID NOT NULL REFERENCES collection_forms(id) ON DELETE CASCADE,
  type          question_type NOT NULL,
  label         TEXT NOT NULL,
  required      BOOLEAN NOT NULL DEFAULT TRUE,
  options       TEXT[],
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_questions_form ON form_questions(form_id, sort_order);

-- ============================================================
-- WIDGETS
-- ============================================================
CREATE TABLE widgets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  template_id       UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT, -- platform asset; deletion only when unused
  template_version  INTEGER NOT NULL,
  layout_type       widget_layout NOT NULL,
  filter_tags       TEXT[] NOT NULL DEFAULT '{}',
  filter_min_rating SMALLINT,
  filter_featured_only BOOLEAN NOT NULL DEFAULT FALSE,
  filter_limit      INTEGER NOT NULL DEFAULT 10,
  style_overrides   JSONB NOT NULL DEFAULT '{}',
  embed_type        TEXT NOT NULL DEFAULT 'script',
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_widgets_app ON widgets(app_id);

-- ============================================================
-- INTEGRATIONS
-- ============================================================
CREATE TABLE integrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id                UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  provider              integration_provider NOT NULL,
  credentials_encrypted TEXT,                      -- KMS envelope-encrypted
  config                JSONB NOT NULL DEFAULT '{}',
  status                integration_status NOT NULL DEFAULT 'connected',
  last_sync_at          TIMESTAMPTZ,
  last_error            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(app_id, provider)
);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE webhook_endpoints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,
  events        TEXT[] NOT NULL DEFAULT '{}',
  status        webhook_status NOT NULL DEFAULT 'active',
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id   UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event                 TEXT NOT NULL,
  payload               JSONB NOT NULL,
  response_status       INTEGER,
  attempt               INTEGER NOT NULL DEFAULT 1,
  status                delivery_status NOT NULL DEFAULT 'pending',
  next_retry_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at);

-- ============================================================
-- INVITES
-- ============================================================
CREATE TABLE invites (
  token         TEXT PRIMARY KEY,
  email         CITEXT NOT NULL,
  scope         invite_scope NOT NULL,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  invited_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- invitations by a removed user are dropped with them
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_email ON invites(email);

-- ============================================================
-- AUDIT LOGS (append-only, high volume — partitioned by month)
-- ============================================================
CREATE TABLE audit_logs (
  -- Append-only by design (no UPDATE/DELETE path in the API). Partitioned by
  -- month from day one so retention pruning is DROP PARTITION, and index
  -- bloat from high-volume writes never hits a single hot table.
  id            BIGSERIAL,
  actor_id      TEXT,
  actor_type    actor_type NOT NULL,
  actor_label   TEXT,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ip            INET,
  user_agent    TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Monthly partitions. This DO block creates the CURRENT and NEXT month so a fresh
-- install always works regardless of when it runs; the maintenance script
-- (infra/postgres/maintain-audit-partitions.sql) creates further months ahead of time.
DO $$
DECLARE
  m_start DATE;
  m_next  DATE;
  m_name  TEXT;
BEGIN
  FOR i IN 0..1 LOOP
    m_start := (date_trunc('month', now()) + (i || ' months')::INTERVAL)::DATE;
    m_next  := (m_start + INTERVAL '1 month')::DATE;
    m_name  := 'audit_logs_' || to_char(m_start, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = m_name) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        m_name, m_start::TEXT, m_next::TEXT);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- DENORMALIZED STATS (materialized, refreshed by worker)
-- ============================================================
CREATE TABLE app_stats (
  app_id            UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
  total_testimonials INTEGER NOT NULL DEFAULT 0,
  approved_count    INTEGER NOT NULL DEFAULT 0,
  pending_count     INTEGER NOT NULL DEFAULT 0,
  avg_rating        NUMERIC(3,2) NOT NULL DEFAULT 0,
  by_source         JSONB NOT NULL DEFAULT '{}',
  by_month          JSONB NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI SERVICE ENGINE (Doc 2 Additive A)
-- Providers + per-task orchestration policy + append-only call log.
-- api keys are stored KMS-ENCRYPTED (never plaintext at rest);
-- routing/circuit-breaker reads drive ProviderRegistry + RoutingService.
-- ============================================================
CREATE TABLE ai_providers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  type                  ai_provider_type NOT NULL,
  status                ai_provider_status NOT NULL DEFAULT 'active',
  api_key_encrypted     TEXT NOT NULL,              -- KMS blob (or 'mock:' passthrough for the mock adapter)
  base_url              TEXT,
  default_model         TEXT NOT NULL,
  max_tokens_per_request INTEGER NOT NULL DEFAULT 2048,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day    INTEGER NOT NULL DEFAULT 10000,
  cost_per_input_token  NUMERIC(12,8) NOT NULL DEFAULT 0,
  cost_per_output_token NUMERIC(12,8) NOT NULL DEFAULT 0,
  priority              INTEGER NOT NULL DEFAULT 100,
  is_fallback           BOOLEAN NOT NULL DEFAULT FALSE,
  settings              JSONB NOT NULL DEFAULT '{}',
  last_error_at         TIMESTAMPTZ,
  last_error            TEXT,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_providers_status ON ai_providers(status);

CREATE TABLE ai_task_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type             ai_task_type NOT NULL,
  name                  TEXT NOT NULL,
  prompt_template       TEXT NOT NULL,
  response_schema       JSONB,
  routing_strategy      ai_routing_strategy NOT NULL DEFAULT 'failover',
  provider_ids          UUID[] NOT NULL DEFAULT '{}',
  provider_weights      JSONB NOT NULL DEFAULT '{}',
  confidence_threshold  NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  auto_approve_threshold NUMERIC(3,2),              -- NULL = never auto-approve (safe default)
  max_retries           INTEGER NOT NULL DEFAULT 2,
  timeout_ms            INTEGER NOT NULL DEFAULT 10000,
  cache_ttl_seconds     INTEGER NOT NULL DEFAULT 3600,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_task_configs_type ON ai_task_configs(task_type);

CREATE TABLE ai_request_logs (
  -- Append-only audit of every AI call (success AND failure) — cost
  -- attribution, confidence triage, quality feedback loop. Partitioned
  -- monthly like audit_logs so retention pruning is DROP PARTITION.
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_config_id        UUID NOT NULL REFERENCES ai_task_configs(id) ON DELETE CASCADE,
  provider_id           UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model                 TEXT NOT NULL,
  prompt                TEXT NOT NULL,
  input_tokens          INTEGER NOT NULL DEFAULT 0,
  output_tokens         INTEGER NOT NULL DEFAULT 0,
  cost_usd              NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms            INTEGER NOT NULL DEFAULT 0,
  raw_response          TEXT,
  parsed_response       JSONB,
  confidence_score      NUMERIC(3,2),
  status                ai_request_status NOT NULL,
  error_message         TEXT,
  human_override        BOOLEAN NOT NULL DEFAULT FALSE,
  human_override_value  TEXT,
  quality_rating        SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE SET NULL,
  app_id                UUID REFERENCES apps(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
CREATE INDEX idx_ai_logs_task ON ai_request_logs(task_config_id, created_at DESC);
CREATE INDEX idx_ai_logs_provider ON ai_request_logs(provider_id, created_at DESC);
CREATE INDEX idx_ai_logs_status ON ai_request_logs(status, created_at DESC);
CREATE INDEX idx_ai_logs_tenant ON ai_request_logs(tenant_id, created_at DESC);

-- Monthly partitions: current + next month (maintenance script grows ahead).
DO $$
DECLARE
  m_start DATE;
  m_next  DATE;
  m_name  TEXT;
  i INT;
BEGIN
  FOR i IN 0..1 LOOP
    m_start := (date_trunc('month', now()) + (i || ' months')::INTERVAL)::DATE;
    m_next  := (m_start + INTERVAL '1 month')::DATE;
    m_name  := 'ai_request_logs_' || to_char(m_start, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = m_name) THEN
      EXECUTE format('CREATE TABLE %I PARTITION OF ai_request_logs FOR VALUES FROM (%L) TO (%L)', m_name, m_start::TEXT, m_next::TEXT);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- UPDATED_AT AUTO-TOUCH TRIGGER (applied to all mutable tables)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_apps_updated BEFORE UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_widgets_updated BEFORE UPDATE ON widgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_forms_updated BEFORE UPDATE ON collection_forms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ai_providers_updated BEFORE UPDATE ON ai_providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ai_task_configs_updated BEFORE UPDATE ON ai_task_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
