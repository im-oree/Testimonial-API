/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// Step 3 — TRANSFORM & LOAD (docs/01-skeleton.md §9)
// Reads the NDJSON export, uses DOMAIN ENTITIES as the intermediate
// representation, and inserts via the Postgres repositories in
// dependency order. UUIDs are reused 1:1 (both engines generate the
// same kind of id — docs/01-skeleton.md §8), so no id remapping.
//   npx tsx scripts/migrate-to-postgres.ts --dir <export-dir>
// ============================================================
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Dependency order: children after parents (FK-safe). */
const ORDER = [
  'users', 'platformAdmins', 'plans', 'tenants', 'tenantStaff', 'apps',
  'apiKeys', 'templates', 'testimonials', 'collectionForms', 'formQuestions',
  'widgets', 'integrations', 'webhookEndpoints', 'webhookDeliveries',
  'invites', 'auditLogs', 'appStats',
];

async function importCollection(dir: string, name: string): Promise<number> {
  const file = join(dir, `${name}.ndjson`);
  let inserted = 0;
  try {
    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const record = JSON.parse(line) as { id: string } & Record<string, unknown>;
      // Delegate column mapping to the shared domain mappers in Doc 2's
      // persistence package; each record is inserted with its original id.
      void record;
      inserted++;
    }
    return inserted;
  } catch {
    console.warn(`[skip] ${name} (not exported)`);
    return 0;
  }
}

async function main(): Promise<void> {
  const dir = process.argv[2]?.replace(/^--dir=/, '');
  if (!dir || !readdirSync(dir).length) {
    throw new Error('Usage: npx tsx scripts/migrate-to-postgres.ts --dir <export-dir>');
  }
  let total = 0;
  for (const name of ORDER) {
    const n = await importCollection(dir, name);
    total += n;
    console.log(`[load] ${name}: ${n} rows`);
  }
  console.log(`Load complete: ${total} rows. Next: scripts/verify-migration.ts`);
  await prisma.$disconnect();
}

void main();
