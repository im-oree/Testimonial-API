# Firebase → PostgreSQL Migration Runbook

> Operational copy of the Doc-1 §9 migration strategy (docs/01-skeleton.md).
> Run this only in a **maintenance window** — tenant-facing writes are
> expected to be paused between Step 1 and Step 5.

## Prerequisites

| Tool | Why |
|---|---|
| Node 20+ | scripts run via `npx tsx` |
| `DATABASE_URL` to a **fresh** Postgres 16 | target DB |
| `GOOGLE_APPLICATION_CREDENTIALS` (or `FIRESTORE_EMULATOR_HOST`) | source Firestore |
| GCS bucket (optional) | NDJSON export landing |

```bash
npm ci
npm run db:generate        # build Prisma client for the Postgres adapter
```

---

## Step 1 — Freeze

Put the API into brief maintenance mode (or schedule a low-traffic window).
No tenant writes may land in Firestore between Export and Cutover, or they
will not be migrated.

## Step 2 — Export (Firestore → NDJSON)

Streams every collection through the **same domain mappers the app uses**,
so "what the app reads" === "what gets exported":

```bash
npx tsx scripts/export-firestore.ts --out gs://bucket/export-YYYY-MM-DD/
# or local dir for a rehearsal:
npx tsx scripts/export-firestore.ts --out ./export-ndjson
```

Produces one NDJSON file per collection (18 collections).

## Step 3 — Transform & Load (NDJSON → Postgres)

Reads the NDJSON, uses domain entities as the intermediate form, inserts in
FK-safe dependency order (users → tenants → apps → api_keys → testimonials
→ …) reusing UUIDs 1:1 (invites: doc-id == token == PK):

```bash
npx tsx scripts/migrate-to-postgres.ts --in ./export-ndjson
```

`schema.sql` must already be applied to the target DB:

```bash
psql "$DATABASE_URL" -f infra/postgres/schema.sql
psql "$DATABASE_URL" -f infra/postgres/seed.sql   # optional dev seed
```

## Step 4 — Verify

```bash
npx tsx scripts/verify-migration.ts --postgres "$DATABASE_URL"
```

Reports **zero discrepancies** on:
- row count per table (source Firestore vs target Postgres)
- spot-checked field values (≥20 random records per major table)
- aggregate stats (total testimonials, avg rating)

## Step 5 — Cutover

```bash
# flip one env var — zero code changes
DATABASE_PROVIDER=postgres
# redeploy api + worker, smoke-test /v1/health and a repository read
```

## Step 5.5 — Security hardening (pre-cutover)

Doc 6 §1.6 — run **after** schema+seed, **before** Step 5 (the app role and
RLS must exist before the API's Postgres sessions come up). Re-runnable.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/hardening/01-security-hardening.sql
# then, out-of-band: set the app role password from the secret store
psql "$DATABASE_URL" -c "ALTER ROLE testimonial_app WITH LOGIN PASSWORD '<from-secret-store>'"
```

The file creates the least-privilege `testimonial_app` role, enables
`ROW LEVEL SECURITY` + the `tenant_isolation` policy on `testimonials`,
drops dangerous extensions if ever present, and installs the `log_ddl`
event trigger writing to `security_audit.ddl_log`. Live verification of
grants and cross-tenant RLS is tracked in the Doc 6 §A checklist.

## Step 6 — Decommission (after a 30-day soak)

- Keep Firestore **read-only** for 30 days as the rollback net.
- Archive the final NDJSON export to cold storage.
- Delete the Firestore project.

## Rollback path

If anything is wrong after Step 5:

1. Flip `DATABASE_PROVIDER` back to `firebase` (the old Firestore data is
   untouched — Step 1 froze writes, and export is read-only).
2. Redeploy. The app keeps working identically against Firestore; nothing
   in the code base changed.
3. Investigate the Postgres discrepancy, re-run Steps 2–4, retry cutover.

## Timing

For planning the real cutover window, run a **full rehearsal** (Steps 2–4)
on a staging copy of realistic seeded data first and record how long it
takes. A rough rule of thumb for this codebase: export+load time is
dominated by Firestore read throughput; ~100k rows move in well under an
hour on a local emulator, less on production Firestore with parallel
streaming (the export script streams collection-by-collection).
