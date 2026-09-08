import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { redactConnectionString } from '../../../common/utils/secret-redaction.util';

// ============================================================
// Loose Prisma delegate typings.
//
// The REAL @prisma/client package is lazy-required at runtime so the
// firebase prototype boots without a generated client (generation needs
// network to binaries.prisma.sh; CI runs `npm run db:generate` first).
// These structural types keep repository code typecheckable either way;
// schema.prisma + generated client remain the type authority in Postgres
// mode. `PgRow` values are `any`-indexed on purpose so filters/aggregates
// over fetched rows compile without the generated per-model types.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PgRow = Record<string, any>;

/** One model delegate (user, tenant, testimonial, ...). */
export interface PgModelDelegate {
  findUnique(args: Record<string, unknown>): Promise<PgRow | null>;
  findUniqueOrThrow(args: Record<string, unknown>): Promise<PgRow>;
  findFirst(args: Record<string, unknown>): Promise<PgRow | null>;
  findFirstOrThrow(args: Record<string, unknown>): Promise<PgRow>;
  findMany(args: Record<string, unknown>): Promise<PgRow[]>;
  create(args: Record<string, unknown>): Promise<PgRow>;
  createMany(args: Record<string, unknown>): Promise<{ count: number }>;
  update(args: Record<string, unknown>): Promise<PgRow>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  delete(args: Record<string, unknown>): Promise<PgRow>;
  deleteMany(args: Record<string, unknown>): Promise<{ count: number }>;
  upsert(args: Record<string, unknown>): Promise<PgRow>;
  count(args?: Record<string, unknown>): Promise<number>;
  groupBy(args: Record<string, unknown>): Promise<PgRow[]>;
  aggregate(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** Transaction client exposes the same per-model delegates. */
export type PgTxClient = Record<string, PgModelDelegate>;

type AnyClient = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(fn: (tx: PgTxClient) => Promise<T>): Promise<T>;
  $queryRawUnsafe<T = PgRow>(query: string, ...params: unknown[]): Promise<T>;
  [model: string]: PgModelDelegate | unknown;
};

/**
 * PrismaClientService — Postgres adapter entry point (production target).
 *
 * Registered by DatabaseModule ONLY when DATABASE_PROVIDER=postgres.
 * The REAL @prisma/client package is lazy-required here (never imported
 * statically) so prototype/firebase boot never touches a Prisma client —
 * important because the generated client only exists after
 * `npm run db:generate` (requires network to binaries.prisma.sh).
 */
@Injectable()
export class PrismaClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaClientService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _client: any = null;

  /** Lazy client instance — real @prisma/client package is required on first use. */
  private get raw(): AnyClient {
    if (!this._client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client') as {
        PrismaClient: new (options?: { datasources?: object; log?: unknown[] }) => unknown;
      };
      const c = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
        log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
      });
      this._client = c;
    }
    return this._client as AnyClient;
  }

  /** Model delegate accessors — one per Prisma model in schema.prisma. */
  get user(): PgModelDelegate {
    return this.raw.user as PgModelDelegate;
  }
  get platformAdmin(): PgModelDelegate {
    return this.raw.platformAdmin as PgModelDelegate;
  }
  get plan(): PgModelDelegate {
    return this.raw.plan as PgModelDelegate;
  }
  get tenant(): PgModelDelegate {
    return this.raw.tenant as PgModelDelegate;
  }
  get tenantStaff(): PgModelDelegate {
    return this.raw.tenantStaff as PgModelDelegate;
  }
  get app(): PgModelDelegate {
    return this.raw.app as PgModelDelegate;
  }
  get apiKey(): PgModelDelegate {
    return this.raw.apiKey as PgModelDelegate;
  }
  get testimonial(): PgModelDelegate {
    return this.raw.testimonial as PgModelDelegate;
  }
  get collectionForm(): PgModelDelegate {
    return this.raw.collectionForm as PgModelDelegate;
  }
  get formQuestion(): PgModelDelegate {
    return this.raw.formQuestion as PgModelDelegate;
  }
  get widget(): PgModelDelegate {
    return this.raw.widget as PgModelDelegate;
  }
  get template(): PgModelDelegate {
    return this.raw.template as PgModelDelegate;
  }
  get integration(): PgModelDelegate {
    return this.raw.integration as PgModelDelegate;
  }
  get webhookEndpoint(): PgModelDelegate {
    return this.raw.webhookEndpoint as PgModelDelegate;
  }
  get webhookDelivery(): PgModelDelegate {
    return this.raw.webhookDelivery as PgModelDelegate;
  }
  get invite(): PgModelDelegate {
    return this.raw.invite as PgModelDelegate;
  }
  get auditLog(): PgModelDelegate {
    return this.raw.auditLog as PgModelDelegate;
  }
  get appStats(): PgModelDelegate {
    return this.raw.appStats as PgModelDelegate;
  }
  get aiProvider(): PgModelDelegate {
    return this.raw.aiProvider as PgModelDelegate;
  }
  get aiTaskConfig(): PgModelDelegate {
    return this.raw.aiTaskConfig as PgModelDelegate;
  }
  get aiRequestLog(): PgModelDelegate {
    return this.raw.aiRequestLog as PgModelDelegate;
  }

  $transaction<T>(fn: (tx: PgTxClient) => Promise<T>): Promise<T> {
    return this.raw.$transaction(fn);
  }

  // Doc 6 §1.2 sanctioned disable path: this method is the deliberate
  // pass-through of the Postgres adapter wrapper itself — NOT a call site.
  // All real call sites are banned repo-wide by the global ESLint rule; any
  // future caller must obtain security review + ticket before disabling it.
  $queryRawUnsafe<T = PgRow>(query: string, ...params: unknown[]): Promise<T> {
    // eslint-disable-next-line no-restricted-syntax -- Doc 6 §1.2: adapter pass-through (see note above)
    return this.raw.$queryRawUnsafe(query, ...params);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.raw.$connect();
      this.logger.log('Connected to PostgreSQL');
    } catch (err) {
      // Doc 6 §1.5: never log the connection string — redact the DSN in case
      // the driver embeds it in the failure diagnostic.
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `PostgreSQL connection failed — repository calls will fail until DATABASE_URL is reachable ` +
          `and the Prisma client is generated (npm run db:generate). ${redactConnectionString(detail)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      const c = this._client as { $disconnect(): Promise<void> };
      await c.$disconnect();
    }
  }
}
