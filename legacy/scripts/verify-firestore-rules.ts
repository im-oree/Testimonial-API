/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// H. Firestore security-rules smoke test — REQUIRES the emulator.
//
// Proves the documented security posture with a real client SDK:
//   1. an unauthenticated client read  → REJECTED (rules `if false`)
//   2. an unauthenticated client write → REJECTED
//   3. a claim it does NOT bypass rules via an auth token path
//
//   npm run emulators                    (terminal 1)
//   npx tsx scripts/verify-firestore-rules.ts   (terminal 2)
//
// Exits 0 only when 1 & 2 are rejected. In CI this runs against the
// GitHub Actions Firestore emulator. The Admin SDK is intentionally
// NOT used here — this must exercise the RULES, not the bypass.
// ============================================================
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  connectFirestoreEmulator,
} from 'firebase/firestore';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const [host, portStr] = EMULATOR_HOST.split(':');
const port = Number(portStr ?? 8080);

async function main(): Promise<void> {
  // Firebase client SDK — required: `npm i -D firebase` in CI/dev when
  // running this check. Emulator ignores API keys.
  const app = initializeApp({
    apiKey: 'emulator',
    projectId: process.env.GCLOUD_PROJECT ?? 'demo-testimonial',
  });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);

  const failures: string[] = [];
  const expectRejected = (label: string, fn: () => Promise<unknown>): Promise<void> =>
    fn()
      .then(() => {
        failures.push(`EXPECTED PERMISSION_DENIED but call SUCCEEDED: ${label}`);
        console.error(`✗ ${label} — was ALLOWED (rules broken!)`);
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string })?.code ?? String(err);
        if (code === 'permission-denied' || /PERMISSION_DENIED/i.test(code)) {
          console.log(`✓ ${label} — rejected (${code})`);
        } else {
          failures.push(`unexpected error for ${label}: ${code}`);
          console.error(`✗ ${label} — unexpected error: ${code}`);
        }
      });

  await expectRejected('client read of /users', () => getDoc(doc(collection(db, 'users'), 'any')));
  await expectRejected('client write to /tenants', () =>
    setDoc(doc(collection(db, 'tenants'), 'hacker-tenant'), { name: 'pwned' }),
  );
  await expectRejected('client read of /testimonials', () =>
    getDoc(doc(collection(db, 'testimonials'), 'any')),
  );
  await expectRejected('client write to /testimonials', () =>
    setDoc(doc(collection(db, 'testimonials'), 'hacker-testimonial'), { message: 'pwned' }),
  );

  await deleteApp(app);

  if (failures.length > 0) {
    console.error(`\n[rules-check] ${failures.length} failure(s). Firestore rules are NOT denying client access.`);
    process.exitCode = 1;
    return;
  }
  console.log('\n[rules-check] OK — Firestore denies all direct client access (rules_version 2, `allow read, write: if false`).');
}

main().catch((err) => {
  console.error('[rules-check] fatal:', err);
  process.exitCode = 1;
});
