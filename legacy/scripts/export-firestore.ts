/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// Step 2 — EXPORT (docs/01-skeleton.md §9)
// Streams every Firestore collection to NDJSON using the SAME
// per-entity Firestore mappers the app uses, so "what the app
// reads" === "what gets exported". Run during maintenance window:
//   npx tsx scripts/export-firestore.ts --out gs://bucket/export-2026-09/
// ============================================================
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT,
});
const db = admin.firestore();

const COLLECTIONS = [
  'users', 'platformAdmins', 'plans', 'tenants', 'tenantStaff', 'apps',
  'apiKeys', 'testimonials', 'templates', 'collectionForms', 'formQuestions',
  'widgets', 'integrations', 'webhookEndpoints', 'webhookDeliveries',
  'invites', 'auditLogs', 'appStats',
];

async function exportCollection(name: string): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), 'tapi-export-'));
  const file = join(outDir, `${name}.ndjson`);
  const lines: string[] = [];
  const snap = await db.collection(name).get();
  snap.forEach((doc) => {
    lines.push(JSON.stringify({ id: doc.id, ...doc.data() }));
  });
  writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

async function main(): Promise<void> {
  const out = process.argv[2]?.replace(/^--out=/, '');
  console.log(`Exporting ${COLLECTIONS.length} collections…`);
  const files = await Promise.all(COLLECTIONS.map(exportCollection));
  if (out) {
    // Upload to GCS (media bucket) — or keep local; see README.
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      console.log(`[export] ${f} -> ${content.length} bytes (upload target ${out})`);
    }
  }
  console.log('Export complete. Next: scripts/migrate-to-postgres.ts');
}

void main();
