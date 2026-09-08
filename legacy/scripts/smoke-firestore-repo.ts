/* eslint-disable repo-boundaries/no-db-driver-outside-infra */
// ============================================================
// Firestore smoke: write one tenant + read it back through the
// SAME Firestore mappers + repositories the app uses. Requires the
// emulator (FIRESTORE_EMULATOR_HOST). Used by CI and by the
// Doc-1 sign-off reviewer to prove seeded data is served by a
// repository call.
//   npx tsx scripts/smoke-firestore-repo.ts
// ============================================================
import { NestFactory } from '@nestjs/core';
import type { ITenantRepository, Tenant } from '@testimonial-api/domain';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import { AppModule } from '../apps/api/src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const tenantRepo = app.get<ITenantRepository>(REPOSITORY_TOKENS.TENANT);

  const SMOKE_ID = '00000000-0000-0000-0000-00000000dead';
  await tenantRepo.create({
    id: SMOKE_ID,
    name: 'Smoke Tenant',
    slug: 'smoke-tenant',
    brandColor: '#123456',
    plan: 'free',
    status: 'active',
    ownerEmail: 'smoke@example.com',
    customDomain: null,
    customDomainVerified: false,
    stripeCustomerId: null,
    currentPeriodEnd: null,
  });

  const read: Tenant | null = await tenantRepo.findById(SMOKE_ID);
  if (!read || read.name !== 'Smoke Tenant' || read.slug !== 'smoke-tenant') {
    console.error('[smoke-firestore-repo] FAIL — read-back mismatch:', read);
    process.exitCode = 1;
    await app.close();
    return;
  }

  console.log(`[smoke-firestore-repo] OK — repo create+findById round-trip on Firestore (id=${read.id}, slug=${read.slug})`);
  await tenantRepo.deleteHard(SMOKE_ID);
  await app.close();
}

main().catch((err) => {
  console.error('[smoke-firestore-repo] fatal:', err);
  process.exitCode = 1;
});
