// ============================================================
// Compile-time stand-in for the generated @prisma/client.
//
// `prisma generate` (npm run db:generate) produces real, fully-typed
// clients from ./schema.prisma — that is what CI and Postgres-mode
// deploys use. This stub exists ONLY so editors/typecheck/build can run
// WITHOUT the generated client (e.g. prototype mode with no network to
// binaries.prisma.sh). The runtime code paths never construct this stub:
// PrismaClientService lazy-requires the REAL package when the postgres
// engine is selected, at which point generation must have run.
//
// The api tsconfig maps '@prisma/client' → this file via `paths`.
// ============================================================

export interface PrismaClientOptions {
  datasources?: { db?: { url?: string } };
  log?: Array<'query' | 'info' | 'warn' | 'error'>;
}

// Delegate shape shared by every model (find/create/update/... loose on
// purpose — schema.prisma is the authoritative type source after generate).
type Delegate = {
  findUnique(args?: unknown): Promise<unknown>;
  findFirst(args?: unknown): Promise<unknown>;
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
  create(args?: unknown): Promise<unknown>;
  update(args?: unknown): Promise<unknown>;
  updateMany(args?: unknown): Promise<{ count: number }>;
  delete(args?: unknown): Promise<unknown>;
  deleteMany(args?: unknown): Promise<{ count: number }>;
  groupBy(args?: unknown): Promise<Array<Record<string, unknown>>>;
  upsert(args?: unknown): Promise<unknown>;
  aggregate(args?: unknown): Promise<unknown>;
};

export class PrismaClient {
  constructor(_options?: PrismaClientOptions) {}
  [model: string]: Delegate | unknown;

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  $transaction<T>(arg: unknown): Promise<T> {
    return arg as Promise<T>;
  }
  $queryRawUnsafe<T>(query: string, ..._params: unknown[]): Promise<T> {
    void query;
    throw new Error('stub');
  }
}
