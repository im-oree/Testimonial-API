// ============================================================
// Provider factory — docs/01-skeleton.md §1.1
//
// Storage engine selection (2026-09-08 — env PROD/LIVE toggle):
//   APP_MODE=prod (default) + DATABASE_PROVIDER=firebase → Firestore
//     adapters (prototype/demo — never used for live traffic)
//   APP_MODE=prod + DATABASE_PROVIDER=postgres           → Postgres
//   APP_MODE=live (env validation)                       → Postgres
//     ONLY; Firebase can never run live.
//
// Every repository token in packages/domain has exactly two concrete
// implementations (one per engine). Swapping engines touches ZERO
// business logic — DatabaseModule below binds the right class per token.
//
// Firestore classes are imported statically (firebase-admin is always an
// installed dependency and safe to require). Postgres classes are loaded
// via dynamic import: the generated @prisma/client only exists after
// `npm run db:generate`, so firebase-mode boots must never require it.
// ============================================================

import type { Provider } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import { PrismaClientService } from './postgres/prisma.client';

import { FirestoreUserRepository } from './firestore/repositories/firestore-user.repository';
import { FirestorePlatformAdminRepository } from './firestore/repositories/firestore-platform-admin.repository';
import { FirestoreTenantRepository } from './firestore/repositories/firestore-tenant.repository';
import { FirestoreTenantStaffRepository } from './firestore/repositories/firestore-tenant-staff.repository';
import { FirestoreAppRepository } from './firestore/repositories/firestore-app.repository';
import { FirestoreApiKeyRepository } from './firestore/repositories/firestore-api-key.repository';
import { FirestoreTestimonialRepository } from './firestore/repositories/firestore-testimonial.repository';
import { FirestoreCollectionFormRepository } from './firestore/repositories/firestore-collection-form.repository';
import { FirestoreFormQuestionRepository } from './firestore/repositories/firestore-form-question.repository';
import { FirestoreAiProviderRepository } from './firestore/repositories/firestore-ai-provider.repository';
import { FirestoreAiTaskConfigRepository } from './firestore/repositories/firestore-ai-task-config.repository';
import { FirestoreAiRequestLogRepository } from './firestore/repositories/firestore-ai-request-log.repository';
import { FirestoreWidgetRepository } from './firestore/repositories/firestore-widget.repository';
import { FirestoreTemplateRepository } from './firestore/repositories/firestore-template.repository';
import { FirestoreIntegrationRepository } from './firestore/repositories/firestore-integration.repository';
import { FirestoreWebhookEndpointRepository } from './firestore/repositories/firestore-webhook-endpoint.repository';
import { FirestoreWebhookDeliveryRepository } from './firestore/repositories/firestore-webhook-delivery.repository';
import { FirestoreInviteRepository } from './firestore/repositories/firestore-invite.repository';
import { FirestoreAuditLogRepository } from './firestore/repositories/firestore-audit-log.repository';
import { FirestorePlanRepository } from './firestore/repositories/firestore-plan.repository';
import { FirestoreAppStatsRepository } from './firestore/repositories/firestore-app-stats.repository';

// Firestore client is importable statically (safe at boot in any mode).
import { FirestoreClient } from './firestore/firestore.client';

export type DatabaseEngine = 'firebase' | 'postgres';

/** Read the engine from env — one tap to SQL. APP_MODE=live forces Postgres. */
export function getDatabaseEngine(): DatabaseEngine {
  if (process.env.APP_MODE === 'live') return 'postgres';
  return process.env.DATABASE_PROVIDER === 'postgres' ? 'postgres' : 'firebase';
}

type Constructor<T = unknown> = new (...args: never[]) => T;

interface RepoBinding {
  token: string;
  firestore: Constructor;
  /** Module path (relative to provider.factory.ts) of the Postgres repo class. */
  postgresModule: string;
  postgresClass: string;
}

export const REPOSITORY_BINDINGS: RepoBinding[] = [
  { token: REPOSITORY_TOKENS.USER, firestore: FirestoreUserRepository, postgresModule: './postgres/repositories/postgres-user.repository', postgresClass: 'PostgresUserRepository' },
  { token: REPOSITORY_TOKENS.PLATFORM_ADMIN, firestore: FirestorePlatformAdminRepository, postgresModule: './postgres/repositories/postgres-platform-admin.repository', postgresClass: 'PostgresPlatformAdminRepository' },
  { token: REPOSITORY_TOKENS.TENANT, firestore: FirestoreTenantRepository, postgresModule: './postgres/repositories/postgres-tenant.repository', postgresClass: 'PostgresTenantRepository' },
  { token: REPOSITORY_TOKENS.TENANT_STAFF, firestore: FirestoreTenantStaffRepository, postgresModule: './postgres/repositories/postgres-tenant-staff.repository', postgresClass: 'PostgresTenantStaffRepository' },
  { token: REPOSITORY_TOKENS.APP, firestore: FirestoreAppRepository, postgresModule: './postgres/repositories/postgres-app.repository', postgresClass: 'PostgresAppRepository' },
  { token: REPOSITORY_TOKENS.API_KEY, firestore: FirestoreApiKeyRepository, postgresModule: './postgres/repositories/postgres-api-key.repository', postgresClass: 'PostgresApiKeyRepository' },
  { token: REPOSITORY_TOKENS.TESTIMONIAL, firestore: FirestoreTestimonialRepository, postgresModule: './postgres/repositories/postgres-testimonial.repository', postgresClass: 'PostgresTestimonialRepository' },
  { token: REPOSITORY_TOKENS.COLLECTION_FORM, firestore: FirestoreCollectionFormRepository, postgresModule: './postgres/repositories/postgres-collection-form.repository', postgresClass: 'PostgresCollectionFormRepository' },
  { token: REPOSITORY_TOKENS.FORM_QUESTION, firestore: FirestoreFormQuestionRepository, postgresModule: './postgres/repositories/postgres-form-question.repository', postgresClass: 'PostgresFormQuestionRepository' },
  { token: REPOSITORY_TOKENS.WIDGET, firestore: FirestoreWidgetRepository, postgresModule: './postgres/repositories/postgres-widget.repository', postgresClass: 'PostgresWidgetRepository' },
  { token: REPOSITORY_TOKENS.TEMPLATE, firestore: FirestoreTemplateRepository, postgresModule: './postgres/repositories/postgres-template.repository', postgresClass: 'PostgresTemplateRepository' },
  { token: REPOSITORY_TOKENS.INTEGRATION, firestore: FirestoreIntegrationRepository, postgresModule: './postgres/repositories/postgres-integration.repository', postgresClass: 'PostgresIntegrationRepository' },
  { token: REPOSITORY_TOKENS.WEBHOOK_ENDPOINT, firestore: FirestoreWebhookEndpointRepository, postgresModule: './postgres/repositories/postgres-webhook-endpoint.repository', postgresClass: 'PostgresWebhookEndpointRepository' },
  { token: REPOSITORY_TOKENS.WEBHOOK_DELIVERY, firestore: FirestoreWebhookDeliveryRepository, postgresModule: './postgres/repositories/postgres-webhook-delivery.repository', postgresClass: 'PostgresWebhookDeliveryRepository' },
  { token: REPOSITORY_TOKENS.INVITE, firestore: FirestoreInviteRepository, postgresModule: './postgres/repositories/postgres-invite.repository', postgresClass: 'PostgresInviteRepository' },
  { token: REPOSITORY_TOKENS.AUDIT_LOG, firestore: FirestoreAuditLogRepository, postgresModule: './postgres/repositories/postgres-audit-log.repository', postgresClass: 'PostgresAuditLogRepository' },
  { token: REPOSITORY_TOKENS.PLAN, firestore: FirestorePlanRepository, postgresModule: './postgres/repositories/postgres-plan.repository', postgresClass: 'PostgresPlanRepository' },
  { token: REPOSITORY_TOKENS.APP_STATS, firestore: FirestoreAppStatsRepository, postgresModule: './postgres/repositories/postgres-app-stats.repository', postgresClass: 'PostgresAppStatsRepository' },
  // AI Service Engine (Doc 2 Additive A)
  { token: REPOSITORY_TOKENS.AI_PROVIDER, firestore: FirestoreAiProviderRepository, postgresModule: './postgres/repositories/postgres-ai-provider.repository', postgresClass: 'PostgresAiProviderRepository' },
  { token: REPOSITORY_TOKENS.AI_TASK_CONFIG, firestore: FirestoreAiTaskConfigRepository, postgresModule: './postgres/repositories/postgres-ai-task-config.repository', postgresClass: 'PostgresAiTaskConfigRepository' },
  { token: REPOSITORY_TOKENS.AI_REQUEST_LOG, firestore: FirestoreAiRequestLogRepository, postgresModule: './postgres/repositories/postgres-ai-request-log.repository', postgresClass: 'PostgresAiRequestLogRepository' },
];

const pgModuleCache = new Map<string, Promise<Record<string, Constructor>>>();

function loadPostgresRepo(binding: RepoBinding): Promise<Constructor> {
  if (!pgModuleCache.has(binding.postgresModule)) {
    pgModuleCache.set(binding.postgresModule, import(binding.postgresModule) as Promise<Record<string, Constructor>>);
  }
  return pgModuleCache.get(binding.postgresModule)!.then((mod) => mod[binding.postgresClass]);
}

/**
 * Build the repository providers for the ACTIVE engine.
 * Use in DatabaseModule.providers — the switch itself.
 */
export function buildRepositoryProviders(): Provider[] {
  const engine = getDatabaseEngine();
  if (engine === 'firebase') {
    return REPOSITORY_BINDINGS.map((b) => ({
      provide: b.token,
      useClass: b.firestore,
    }));
  }
  // Postgres: async factories so the generated Prisma client is only
  // required when this engine is actually selected.
  return REPOSITORY_BINDINGS.map((b) => ({
    provide: b.token,
    inject: [PrismaClientService],
    useFactory: async (prisma: PrismaClientService) => {
      const Repo = await loadPostgresRepo(b);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (Repo as any)(prisma);
    },
  }));
}

export const ALL_REPOSITORY_TOKENS = REPOSITORY_BINDINGS.map((b) => b.token);

/** The concrete client a given engine needs to exist (used for DI wiring). */
export function engineClientProviders(): Provider[] {
  return getDatabaseEngine() === 'postgres'
    ? [{ provide: PrismaClientService, useClass: PrismaClientService }]
    : [{ provide: FirestoreClient, useClass: FirestoreClient }];
}

export type { FirestoreClient, PrismaClientService };
