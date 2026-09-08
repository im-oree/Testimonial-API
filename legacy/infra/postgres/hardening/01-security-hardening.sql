-- ============================================================
-- DOC 6 §1.6 — DATABASE-LEVEL SECURITY HARDENING (PostgreSQL)
-- Idempotent / re-runnable. Run as the migration SUPERUSER **after**
-- schema.sql + seed.sql and **before** app cutover:
--
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/hardening/01-security-hardening.sql
--
-- Sections (mirror Doc 6 §1.6 1–4):
--   1. Dedicated least-privilege application role `testimonial_app`
--   2. Row-Level Security on `testimonials` (tenant-isolation safety net)
--   3. Dangerous-extension lockdown
--   4. DDL change logging (event trigger)
--
-- Everything is guarded so re-running never errors and never duplicates.
-- Live-DB verification lives in the Doc 6 §A checklist (run as the app user
-- and as a second tenant; cross-tenant reads must return zero rows).
--
-- NOTE: no explicit BEGIN/COMMIT — psql autocommits per statement so role
-- DDL and the event trigger never run inside a transaction block, and each
-- guarded section is independently re-runnable.
-- ============================================================

-- ============================================================
-- 1. Least-privilege application role
-- ============================================================
-- Doc: "CREATE ROLE testimonial_app WITH LOGIN PASSWORD '...'" — the password
-- is a placeholder that must NEVER be committed. Create the role passwordless
-- here; supply the real secret out-of-band (Secret Manager / Render env) via:
--     ALTER ROLE testimonial_app WITH LOGIN PASSWORD '<from-secret-store>';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'testimonial_app') THEN
    CREATE ROLE testimonial_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    -- PASSWORD deliberately unset — see note above.
  END IF;
END $$;

-- GRANT CONNECT on the database this script runs against (psql "$DATABASE_URL").
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO testimonial_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO testimonial_app;

-- DML on every existing table/sequence…
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO testimonial_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO testimonial_app;
-- …and on everything created in the future (partitions, new tables).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO testimonial_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO testimonial_app;

-- Explicitly DENY dangerous operations (Doc 6 §1.6.1).
REVOKE CREATE ON SCHEMA public FROM testimonial_app;
REVOKE ALL ON pg_catalog FROM testimonial_app;
-- Note: the pg_catalog REVOKE removes only direct role grants; PUBLIC retains
-- its default read-only USAGE (required by Prisma introspection/query
-- planning). The real control is: no CREATE anywhere, no superuser, and the
-- extensions lockdown in section 3. Re-check role membership before cutover:
--     \du+ testimonial_app

-- ============================================================
-- 2. Row-Level Security — tenant isolation safety net
-- ============================================================
-- Doc 6 §1.6.2. RLS is a SECONDARY net: the application layer always scopes
-- queries by tenant/app; the database enforces it anyway so a buggy or
-- forgotten app_id predicate can never read another tenant's testimonials.
-- The app user must set the tenant context per session/transaction:
--     SET LOCAL app.current_tenant_id = '<tenant-uuid>';
-- (the API sets this on its pooled connection before any tenant query).
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'testimonials' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON testimonials
      USING (app_id IN (
        SELECT id FROM apps
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
      ));
  END IF;
END $$;

-- ============================================================
-- 3. Dangerous-extension lockdown
-- ============================================================
-- Doc 6 §1.6.3: "Only pgcrypto and pg_trgm are enabled. No dblink, no
-- file_fdw, no plpython." The repo's canonical schema (infra/postgres/
-- schema.sql) additionally enables citext for case-insensitive email/slug
-- columns — a pure text-collation helper with no file/network surface, so it
-- stays. Everything with a file/network/OS-exec surface is dropped if a
-- legacy DB ever enabled it.
DO $$
DECLARE
  dangerous TEXT[] := ARRAY['dblink', 'file_fdw', 'postgres_fdw', 'plpythonu', 'plpython3u', 'plperl', 'lo', 'pg_repack'];
  ext TEXT;
BEGIN
  FOREACH ext IN ARRAY dangerous LOOP
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext) THEN
      RAISE NOTICE 'Dropping dangerous extension: %', ext;
      EXECUTE format('DROP EXTENSION IF EXISTS %I', ext);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 4. DDL change logging
-- ============================================================
-- Doc 6 §1.6.4: CREATE EVENT TRIGGER log_ddl ON ddl_command_end
-- EXECUTE FUNCTION log_ddl_changes();  — needs the audit function + table.
CREATE SCHEMA IF NOT EXISTS security_audit;

CREATE TABLE IF NOT EXISTS security_audit.ddl_log (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_user   TEXT NOT NULL,
  session_user TEXT NOT NULL,
  tenant_ctx   TEXT,             -- current_setting('app.current_tenant_id', true), when set
  tag          TEXT NOT NULL,    -- e.g. CREATE TABLE / ALTER TABLE / DROP INDEX
  object_type  TEXT,
  object_name  TEXT,
  command_text TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION security_audit.log_ddl_changes()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  r record;
  tenant_ctx text := NULLIF(current_setting('app.current_tenant_id', true), '');
BEGIN
  FOR r IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
  LOOP
    INSERT INTO security_audit.ddl_log
      (login_user, session_user, tenant_ctx, tag, object_type, object_name, command_text)
    VALUES
      (current_user, session_user, tenant_ctx, tg_tag, r.object_type, r.object_identity, current_query());
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'log_ddl') THEN
    CREATE EVENT TRIGGER log_ddl ON ddl_command_end
      EXECUTE FUNCTION security_audit.log_ddl_changes();
  END IF;
END $$;
