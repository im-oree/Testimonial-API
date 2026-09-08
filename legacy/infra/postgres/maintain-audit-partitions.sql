-- ============================================================
-- Maintain audit_logs monthly partitions ahead of time.
-- Run monthly via cron/worker (Doc 2): creates partitions for the
-- next N months (default 3). Partitions never drop data — audit
-- logs are append-only; retention is a separate policy decision.
--   psql -f infra/postgres/maintain-audit-partitions.sql -v lookahead=3
-- ============================================================

DO $$
DECLARE
  lookahead INT := COALESCE(NULLIF(current_setting('lookahead', true), ''), '3')::INT;
  m_start DATE;
  m_name  TEXT;
  i       INT;
BEGIN
  IF lookahead < 1 OR lookahead > 24 THEN
    RAISE EXCEPTION 'lookahead must be between 1 and 24 (got %)', lookahead;
  END IF;
  FOR i IN 1..lookahead LOOP
    m_start := (date_trunc('month', now()) + (i || ' months')::INTERVAL)::DATE;
    m_name  := 'audit_logs_' || to_char(m_start, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = m_name) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        m_name, m_start::TEXT, (m_start + INTERVAL '1 month')::TEXT);
      RAISE NOTICE 'created partition %', m_name;
    END IF;
    -- AI request logs (same monthly cadence)
    m_name := 'ai_request_logs_' || to_char(m_start, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = m_name) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF ai_request_logs FOR VALUES FROM (%L) TO (%L)',
        m_name, m_start::TEXT, (m_start + INTERVAL '1 month')::TEXT);
      RAISE NOTICE 'created partition %', m_name;
    END IF;
  END LOOP;
END $$;
