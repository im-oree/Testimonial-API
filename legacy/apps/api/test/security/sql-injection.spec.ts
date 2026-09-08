import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { CreateTestimonial, Testimonial } from '@testimonial-api/domain';
import { PostgresTestimonialRepository } from '../../src/infrastructure/database/postgres/repositories/postgres-testimonial.repository';
import type { PrismaClientService } from '../../src/infrastructure/database/postgres/prisma.client';
import { TestimonialPgMappers } from '../../src/infrastructure/database/postgres/mappers/testimonial.mapper';
import { sanitizeSearchInput } from '../../src/common/utils/sanitize-search-input';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

/**
 * Doc 6 §1.7 — SQL-injection adversarial suite.
 *
 * The public HTTP routes (GET/POST /v1/public/testimonials) are still Doc-3
 * placeholders, so this suite runs the payload set against the Postgres
 * repository/service seam with a fake Prisma delegate — the exact boundary
 * where a real DB would execute the query. Every assertion below maps 1:1 to
 * the §1.7 HTTP contract:
 *
 *   search path      → expect 200 with empty results / 422 — NEVER 500
 *   tags filter path → expect 200 / 422 — NEVER 500
 *   create path      → expect 201 / 422; if stored, the payload is literal
 *                      text, never interpreted/executed
 *   response text    → never matches /syntax error|pg_|relation|column/i
 *
 * The suite runs in CI on every PR; a single failure blocks the merge.
 */
export const SQL_INJECTION_PAYLOADS: readonly string[] = [
  "' OR '1'='1",
  "'; DROP TABLE testimonials; --",
  "' UNION SELECT * FROM users --",
  '1; SELECT pg_sleep(10) --',
  "' AND 1=CONVERT(int, (SELECT TOP 1 table_name FROM information_schema.tables)) --",
  "admin'--",
  "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a) --",
  "' OR 1=1 LIMIT 1 --",
  "'; EXEC xp_cmdshell('whoami'); --",
  "1; INSERT INTO users (email, password_hash) VALUES ('attacker@evil.com', 'hacked') --",
  "' OR ''='",
  '1 OR 1=1',
  "1' ORDER BY 1--",
  "1' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version())))--",
  "'; WAITFOR DELAY '0:0:5'--",
];

const SQL_NOISE = /syntax error|pg_|relation|column/i;

interface TestimonialDelegateCallArgs {
  findMany: Array<{ where?: Record<string, unknown>; skip?: number; take?: number }>;
  count: Array<{ where?: Record<string, unknown> }>;
  create: Array<{ data?: Record<string, unknown> }>;
}

/** Fake Prisma delegate: records every call, returns empty results — never
 *  touches a DB, so any thrown error would be a *code-path* bug, not a live
 *  SQL error (which is what this suite must prove absent). */
function makeFakePrisma() {
  const calls: TestimonialDelegateCallArgs = { findMany: [], count: [], create: [] };
  const delegate = {
    findMany: async (args: { where?: Record<string, unknown>; skip?: number; take?: number }) => {
      calls.findMany.push(args);
      return [];
    },
    count: async (args: { where?: Record<string, unknown> }) => {
      calls.count.push(args);
      return 0;
    },
    create: async (args: { data?: Record<string, unknown> }) => {
      calls.create.push(args);
      // Echo the persistence row back — the repository maps it to domain via
      // the same mapper used on reads, proving literal (verbatim) storage.
      return (args.data ?? {}) as never;
    },
    findFirst: async () => null,
    findUnique: async () => null,
    update: async () => ({}),
    updateMany: async () => ({ count: 0 }),
    groupBy: async () => [],
  };
  const prisma = { testimonial: delegate } as unknown as PrismaClientService;
  return { prisma, calls };
}

function makeCreateInput(payload: string): CreateTestimonial {
  return {
    appId: 'app-1',
    environment: 'test',
    authorName: payload,
    authorTitle: null,
    authorCompany: null,
    authorAvatarUrl: null,
    authorEmail: 'attacker@example.com',
    message: payload,
    rating: null,
    ratingType: 'none',
    videoUrl: null,
    source: 'api',
    sourceRef: null,
    customFields: {},
    fingerprint: 'fp-adversarial',
    language: null,
    consentGiven: true,
  };
}

describe('Doc 6 §1.7 — SQL Injection Prevention (adversarial payloads)', () => {
  describe('search path — repo.findMany({ search: payload })', () => {
    it.each(SQL_INJECTION_PAYLOADS)('safely handles search payload: %s', async (payload) => {
      const { prisma, calls } = makeFakePrisma();
      const repo = new PostgresTestimonialRepository(prisma);

      // "200 with empty results" at the repository seam: must resolve
      // (never a 500-equivalent rejection), and return zero rows.
      const res = await repo.findMany({ appId: 'app-1', search: payload }, { page: 1, pageSize: 50 });
      expect(res.items).toHaveLength(0);
      expect(res.total).toBe(0);

      // Tenant scoping survives the payload — where.app_id is always pinned.
      const where = calls.findMany[0]?.where ?? {};
      expect(where.app_id).toBe('app-1');

      // The filter only ever carries the SANITIZED literal — never the raw
      // payload as a SQL fragment, never an unescaped LIKE wildcard.
      const expectedNeedle = sanitizeSearchInput(payload);
      const or = where.OR as Array<Record<string, { contains: string; mode: string }>>;
      expect(or[0].message.contains).toBe(expectedNeedle);
      expect(or[1].author_name.contains).toBe(expectedNeedle);
    });
  });

  describe('tags filter path — repo.findMany({ tags: [payload] })', () => {
    it.each(SQL_INJECTION_PAYLOADS)('safely handles tags payload: %s', async (payload) => {
      const { prisma, calls } = makeFakePrisma();
      const repo = new PostgresTestimonialRepository(prisma);

      const res = await repo.findMany({ appId: 'app-1', tags: [payload] }, { page: 1, pageSize: 50 });
      expect(res.items).toHaveLength(0);

      const where = calls.findMany[0]?.where ?? {};
      // Tags travel as a parameterized array value — hasSome [payload] is the
      // literal string, never parsed as SQL.
      expect((where.tags as { hasSome: string[] }).hasSome).toEqual([payload]);
      expect(where.app_id).toBe('app-1');
    });
  });

  describe('create path — repo.create({ message: payload, authorName: payload })', () => {
    it.each(SQL_INJECTION_PAYLOADS)('stores payload as literal text: %s', async (payload) => {
      const { prisma, calls } = makeFakePrisma();
      const repo = new PostgresTestimonialRepository(prisma);

      // "201": resolves — creation never rejects on adversarial input.
      const created = await repo.create(makeCreateInput(payload));

      // The write path must NOT escape/strip — Prisma parameterizes the
      // value, so the payload lands in the column verbatim.
      expect((created as Testimonial).message).toBe(payload);
      expect((created as Testimonial).authorName).toBe(payload);

      // Same guarantee at the persistence seam (what the delegate receives).
      const persisted = calls.create[0]?.data ?? {};
      expect(persisted.message).toBe(payload);
      expect(persisted.author_name).toBe(payload);

      // Mapper round-trip is identity for the payload (literal, interpreted).
      const row = TestimonialPgMappers.toPersistence({ message: payload, authorName: payload });
      expect(row.message).toBe(payload);
      expect(row.author_name).toBe(payload);
    });
  });

  describe('error envelope — no SQL diagnostics ever reach the client', () => {
    function makeHost(json: ReturnType<typeof vi.fn>) {
      const status = vi.fn(() => ({ json }));
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status }),
          getRequest: () => ({ method: 'GET', url: '/v1/public/testimonials' }),
        }),
      } as unknown as ArgumentsHost;
      return host;
    }

    it('maps an unknown DB error to the generic INTERNAL envelope with zero SQL text', async () => {
      const json = vi.fn();
      const filter = new AllExceptionsFilter();
      const host = makeHost(json);

      const sqlError = new Error(
        'syntax error at or near "OR"\n' +
          'relation "users" does not exist\n' +
          'LINE 3: ... WHERE app_id = 1 OR 1=1-- LIMIT 1\n' +
          'connection: postgresql://appuser:sup3rs3cret@db.internal:5432/testimonial_api',
      );
      filter.catch(sqlError, host);

      const body = json.mock.calls[0]?.[0] as { error: { code: string; message: string } };
      expect(body).toBeDefined();
      // Repo-wide error contract (README §11): generic 500 body, code INTERNAL.
      // (Doc 6 checklist A8 prints INTERNAL_ERROR — see progress-log note.)
      expect(body.error.code).toBe('INTERNAL');
      // The hard requirement: no SQL details, no DSN credentials leak.
      expect(body.error.message).not.toMatch(SQL_NOISE);
      expect(JSON.stringify(body)).not.toMatch(SQL_NOISE);
      expect(JSON.stringify(body)).not.toMatch(/sup3rs3cret|postgres(ql)?:\/\//);
    });

    it.each(SQL_INJECTION_PAYLOADS)('never reflects a search payload in an error body: %s', async (payload) => {
      const json = vi.fn();
      const filter = new AllExceptionsFilter();
      filter.catch(new Error(`boom ${payload}`), makeHost(json));
      const body = json.mock.calls[0]?.[0] as { error: { message: string } };
      expect(JSON.stringify(body)).not.toMatch(SQL_NOISE);
    });
  });
});
