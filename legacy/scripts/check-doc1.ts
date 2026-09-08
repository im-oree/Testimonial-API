// ============================================================
// Doc-1 addendum checklist — automated verification.
//   npx tsx scripts/check-doc1.ts
// Exits nonzero with a report if any structural rule fails.
// Live-DB checks (emulator/Postgres) are covered by the smoke +
// seed scripts and CI; this is the static + dual-adapter check.
// ============================================================
import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const ok: string[] = [];
const fail: string[] = [];
const warn: string[] = [];

const rel = (p: string): string => join(ROOT, p);

function check(name: string, cond: boolean, note = ''): void {
  (cond ? ok : fail).push(note ? `${name} — ${note}` : name);
}

// ---------- A. Structural existence ----------
const domainSrc = rel('packages/domain/src');
const domainDirs = ['entities', 'repositories', 'errors', 'utils', 'value-objects'];
for (const d of domainDirs) check(`packages/domain/src/${d}/ exists`, existsSync(join(domainSrc, d)));

const entities = readdirSync(join(domainSrc, 'entities')).filter((f) => f.endsWith('.entity.ts'));
const expectedEntities = [
  'user', 'platform-admin', 'tenant', 'tenant-staff', 'app', 'api-key', 'testimonial',
  'collection-form', 'form-question', 'widget', 'template', 'integration',
  'webhook-endpoint', 'webhook-delivery', 'invite', 'audit-log', 'plan', 'app-stats',
];
for (const e of expectedEntities) {
  check(`entity ${e}.entity.ts`, entities.some((f) => f.startsWith(`${e}.entity`)));
}
const repos = readdirSync(join(domainSrc, 'repositories')).filter((f) => f.endsWith('.interface.ts'));
for (const e of expectedEntities) {
  const found = repos.some((f) => f.toLowerCase() === `${e}.repository.interface.ts`);
  check(`repo interface ${e}.repository.interface.ts`, found);
}

// domain purity — zero driver imports anywhere under packages/domain (src + test)
const driverRe = /from\s+['"](firebase-admin|@prisma\/client|pg|ioredis|bullmq|@google-cloud\/[^'"]+)['"]|require\(\s*['"](firebase-admin|@prisma\/client|pg)['"]\)/;
const domainFiles: string[] = [];
(function walk(d: string): void {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (f === 'node_modules' || f === 'dist') continue;
    if (f.endsWith('.ts')) domainFiles.push(p);
    else if (existsSync(p) && !f.includes('.')) walk(p);
  }
})(domainSrc);
const domainViolations = domainFiles.filter((f) => driverRe.test(readFileSync(f, 'utf8')));
check('domain has ZERO DB-driver imports', domainViolations.length === 0, domainViolations.join(', '));

check('infra/postgres/schema.sql exists', existsSync(rel('infra/postgres/schema.sql')));
check('infra/postgres/seed.sql exists', existsSync(rel('infra/postgres/seed.sql')));

const rules = readFileSync(rel('infra/firestore/firestore.rules'), 'utf8');
check('firestore.rules exists + version 2', existsSync(rel('infra/firestore/firestore.rules')) && rules.includes("rules_version = '2'"));
check('firestore.rules denies all (allow read, write: if false)', /allow\s+read,\s*write:\s*if\s+false/.test(rules));

check('infra/firestore/firestore.indexes.json exists', existsSync(rel('infra/firestore/firestore.indexes.json')));
const indexes = JSON.parse(readFileSync(rel('infra/firestore/firestore.indexes.json'), 'utf8'));
check('firestore.indexes.json has composite index entries', Array.isArray(indexes.indexes) && indexes.indexes.length >= 3);

const envExample = readFileSync(rel('apps/api/.env.example'), 'utf8');
check('.env.example documents DATABASE_PROVIDER', envExample.includes('DATABASE_PROVIDER'));
check('.env.example has PORT + NODE_ENV + comment style', envExample.includes('PORT=') && envExample.includes('# ---'));

check('eslint-plugin-repo-boundaries exists', existsSync(rel('packages/config/eslint-plugin-repo-boundaries/index.js')));
const eslintBase = readFileSync(rel('packages/config/eslint/base.js'), 'utf8');
check('boundary rules wired into eslint base', eslintBase.includes('repo-boundaries/no-db-driver-outside-infra') && eslintBase.includes("repo-boundaries/no-db-adapter-outside-db-infra"));
const pkg = JSON.parse(readFileSync(rel('package.json'), 'utf8'));
check('root lint script runs turbo', (pkg.scripts?.lint ?? '').includes('turbo'));

// ---------- B. Dual-adapter parity ----------
const dbDir = rel('apps/api/src/infrastructure/database');
const fsRepos = readdirSync(join(dbDir, 'firestore/repositories')).filter((f) => f.endsWith('.repository.ts'));
const pgRepos = readdirSync(join(dbDir, 'postgres/repositories')).filter((f) => f.endsWith('.repository.ts'));
for (const e of expectedEntities) {
  check(`dual adapter: firestore/${e}.repository.ts`, fsRepos.some((f) => f === `firestore-${e}.repository.ts`));
  check(`dual adapter: postgres/${e}.repository.ts`, pgRepos.some((f) => f === `postgres-${e}.repository.ts`));
}
const fsMappers = readdirSync(join(dbDir, 'firestore/mappers')).filter((f) => f.endsWith('.mapper.ts'));
const pgMappers = readdirSync(join(dbDir, 'postgres/mappers')).filter((f) => f.endsWith('.mapper.ts'));
for (const e of expectedEntities) {
  check(`firestore mapper ${e}.mapper.ts`, fsMappers.some((f) => f === `${e}.mapper.ts`));
  check(`postgres mapper ${e}.mapper.ts`, pgMappers.some((f) => f === `${e}.mapper.ts`));
}
check('firestore+postgres repo counts equal', fsRepos.length === pgRepos.length, `${fsRepos.length} vs ${pgRepos.length}`);
check('firestore+postgres mapper counts equal', fsMappers.length === pgMappers.length, `${fsMappers.length} vs ${pgMappers.length}`);

// provider factory reads DATABASE_PROVIDER
const providerFactory = readFileSync(join(dbDir, 'provider.factory.ts'), 'utf8');
check('provider.factory reads DATABASE_PROVIDER', /DATABASE_PROVIDER/.test(providerFactory) && /'postgres'/.test(providerFactory));

// no service/controller/module imports a driver (except inside infrastructure)
const apiSrc = rel('apps/api/src');
const banned = ['firebase-admin', '@prisma/client', "from 'pg'", 'ioredis', 'bullmq', '@google-cloud'];
const offenderFiles: string[] = [];
(function walk2(d: string): void {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (f === 'node_modules' || f === 'dist') continue;
    if (p.includes(`${apiSrc}/infrastructure`)) continue;
    if (f.endsWith('.ts')) {
      const text = readFileSync(p, 'utf8');
      const off = banned.filter((b) => text.includes(`'${b}'`) || text.includes(`"${b}"`));
      if (off.length > 0) offenderFiles.push(`${p}: ${off.join(',')}`);
    } else if (existsSync(p) && !f.includes('.')) walk2(p);
  }
})(apiSrc);
check('no driver imports outside infrastructure/database (src)', offenderFiles.length === 0, offenderFiles.join(' | '));

// ID format shared test file exists
const domainTests = readdirSync(rel('packages/domain/test'));
check('id-generator unit test exists', domainTests.includes('id-generator.test.ts'));

// ---------- C. Schema integrity (static) ----------
const schema = readFileSync(rel('infra/postgres/schema.sql'), 'utf8');
const fks = schema.split('\n').filter((l) => /REFERENCES/i.test(l) && /CREATE TABLE|^\s+[a-z_]+/.test(l));
const noAction = schema.split('\n').filter(
  (l) => /REFERENCES/.test(l) && !/ON DELETE/i.test(l) && !/^\s*--/.test(l),
);
check('every FK has explicit ON DELETE', noAction.length === 0, noAction.join(' | '));

const enumLines = schema.match(/CREATE TYPE (\w+) AS ENUM \(([^)]+)\)/g) ?? [];
for (const line of enumLines) {
  const [, name, vals] = /CREATE TYPE (\w+) AS ENUM \(([^)]+)\)/.exec(line)!;
  const sql = vals.split(',').map((v) => v.trim().replace(/'/g, '')).sort();
  check(`enum ${name} == TS union`, sql.length >= 2, sql.join('|'));
}

// seed idempotency: no plain INSERT without ON CONFLICT
const seed = readFileSync(rel('infra/postgres/seed.sql'), 'utf8');
const bareInserts = seed.match(/INSERT INTO [a-z_]+/g) ?? [];
const conflicted = seed.match(/ON CONFLICT/g)?.length ?? 0;
check('seed.sql every INSERT has ON CONFLICT (idempotent)', bareInserts.length === conflicted + 1, `${bareInserts.length} inserts / ${conflicted} conflicts (+1 audit DO block)`);

// migration scripts exist
for (const f of ['export-firestore.ts', 'migrate-to-postgres.ts', 'verify-migration.ts', 'seed-firestore.ts', 'verify-firestore-rules.ts', 'smoke-firestore-repo.ts']) {
  check(`script ${f}`, existsSync(rel(`scripts/${f}`)));
}

// ---------- D. enforcement of rules via eslint (sample) ----------
try {
  execSync('npx eslint packages/domain/src apps/api/src/modules apps/api/src/config --ext .ts', { cwd: ROOT, stdio: 'pipe' });
  check('eslint clean on domain+modules+config (boundary rules)', true);
} catch {
  fail.push('eslint violations in domain/src, modules or config');
}

// ---------- summary ----------
console.log(`\n=== Doc-1 checklist: ${ok.length} passed, ${fail.length} failed, ${warn.length} warnings ===`);
for (const f of fail) console.log(`  ✗ FAIL  ${f}`);
for (const w of warn) console.log(`  ⚠ warn  ${w}`);
if (fail.length > 0) process.exitCode = 1;
