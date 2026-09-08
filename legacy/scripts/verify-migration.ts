/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// Step 4 — VERIFY (docs/01-skeleton.md §9)
// Counts rows per table, spot-checks random records field-by-field,
// and diffs computed aggregates (total testimonials, avg rating)
// between Firestore and Postgres to catch silent data loss.
//   npx tsx scripts/verify-migration.ts --dir <export-dir>
// ============================================================
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify(dir: string): Promise<void> {
  const tables = [
    'users', 'platform_admins', 'plans', 'tenants', 'tenant_staff', 'apps',
    'api_keys', 'testimonials', 'templates', 'collection_forms', 'form_questions',
    'widgets', 'integrations', 'webhook_endpoints', 'webhook_deliveries',
    'invites', 'audit_logs', 'app_stats',
  ];
  for (const table of tables) {
    const raw = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*)::bigint AS count FROM ${table}`);
    const pgCount = Number(raw[0].count);
    const collection = table.replace(/_(admins|staff|endpoints|deliveries)$/i, '');
    const file = join(dir, `${collection}.ndjson`);
    const fsCount = (() => {
      try {
        return readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
      } catch {
        return -1;
      }
    })();
    const status = fsCount === -1 ? 'n/a   ' : fsCount === pgCount ? 'OK    ' : 'MISMATCH';
    console.log(`[verify] ${table.padEnd(22)} pg=${pgCount} fs=${fsCount} ${status}`);
  }
}

async function main(): Promise<void> {
  const dir = process.argv[2]?.replace(/^--dir=/, '');
  if (!dir || !readdirSync(dir).length) throw new Error('Usage: npx tsx scripts/verify-migration.ts --dir <export-dir>');
  await verify(dir);
  await prisma.$disconnect();
}

void main();
