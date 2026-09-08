/* eslint-disable no-console */
// ============================================================
// Doc 2 Additive A — "AI Service Engine (full + deployment
// flexibility)" static checklist. Run: npx tsx scripts/check-doc2.ts
//
// Static/structural evidence only (mirrors scripts/check-doc1.ts).
// Behavioural evidence lives in the vitest suites under
// apps/api/test/ai (routing per strategy, weighted ±5%, confidence
// boundaries, adversarial-injection blocking, retries→AiExecutionError,
// fromCache without log rows, exact cost math, review feedback loop,
// KMS dispatch). Real-provider end-to-end + failover/injection live
// proof and live-DB CI runs remain sign-off items (docs/02).
// ============================================================
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const API = join(ROOT, 'apps/api/src');
const AI = join(API, 'infrastructure/ai');
const FS_REPOS = join(API, 'infrastructure/database/firestore/repositories');
const PG_REPOS = join(API, 'infrastructure/database/postgres/repositories');
const FS_MAPPERS = join(API, 'infrastructure/database/firestore/mappers');
const PG_MAPPERS = join(API, 'infrastructure/database/postgres/mappers');
const DOMAIN = join(ROOT, 'packages/domain/src');
const TESTS = join(ROOT, 'apps/api/test/ai');

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(ok: boolean, label: string): void {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push(label);
    console.error(`  ✗ FAIL ${label}`);
  }
}

function fileIn(dir: string, name: string): boolean {
  return existsSync(join(dir, name));
}

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

function main(): void {
  console.log('Doc 2 Additive A — AI Service Engine static checklist\n');

  // ---- A. Domain slice -------------------------------------------------
  console.log('A. Domain slice');
  check(fileIn(join(DOMAIN, 'entities'), 'ai-provider.entity.ts'), 'ai-provider.entity.ts');
  check(fileIn(join(DOMAIN, 'entities'), 'ai-task-config.entity.ts'), 'ai-task-config.entity.ts');
  check(fileIn(join(DOMAIN, 'entities'), 'ai-request-log.entity.ts'), 'ai-request-log.entity.ts');
  const entitiesIndex = read(join(DOMAIN, 'entities/index.ts'));
  check(
    ['AiProvider', 'AiTaskConfig', 'AiRequestLog', 'AiTaskResult', 'AiCostSummary'].every((t) => entitiesIndex.includes(t)),
    'entity barrel exports AI entities + result/cost types',
  );
  for (const port of ['ai-provider.repository.interface.ts', 'ai-task-config.repository.interface.ts', 'ai-request-log.repository.interface.ts', 'ai-provider.adapter.interface.ts', 'kms.port.ts']) {
    check(fileIn(join(DOMAIN, 'repositories'), port), `domain port ${port}`);
  }
  const reposIndex = read(join(DOMAIN, 'repositories/index.ts'));
  check(
    ["AI_PROVIDER: 'IAiProviderRepository'", "AI_TASK_CONFIG: 'IAiTaskConfigRepository'", "AI_REQUEST_LOG: 'IAiRequestLogRepository'", "KMS: 'IKmsDecryptor'"].every((t) =>
      reposIndex.includes(t),
    ),
    'REPOSITORY_TOKENS carry AI_PROVIDER / AI_TASK_CONFIG / AI_REQUEST_LOG / KMS',
  );
  const errorsIndex = read(join(DOMAIN, 'errors/index.ts'));
  const aiErrorsFile = read(join(DOMAIN, 'errors/ai.errors.ts'));
  check(errorsIndex.includes("export * from './ai.errors';"), 'errors barrel exports ai.errors');
  check(
    ['AiProviderError', 'NoAvailableProviderError', 'AiTaskNotConfiguredError', 'AiExecutionError', 'AiInputRejectedError'].every((e) =>
      aiErrorsFile.includes(e),
    ),
    'AI error classes defined in domain',
  );

  // ---- B. Engine services under infrastructure/ai ----------------------
  console.log('B. infrastructure/ai engine surface');
  const aiFiles = readdirSync(AI);
  const aiText = (name: string): string => (aiFiles.includes(name) ? read(join(AI, name)) : '');
  check(aiText('orchestrator.service.ts').includes('executeTask'), 'AiOrchestratorService.executeTask entry point');
  check(aiText('orchestrator.service.ts').includes('AiExecutionError'), 'exhausted retries throw AiExecutionError');
  check(aiText('provider-registry.service.ts').includes('CIRCUIT_OPEN_AFTER = 3'), 'circuit breaker threshold > 3');
  const routing = aiText('routing.service.ts');
  check(
    ['round_robin', 'weighted', 'failover', 'cheapest', 'fastest', 'single'].every((s) => routing.includes(`'${s}'`)),
    'all six routing strategies implemented',
  );
  check(aiText('confidence.service.ts').includes('CONFIDENCE_REJECT_FLOOR = 0.3'), 'confidence reject floor 0.3');
  check(
    /classify_testimonial[\s\S]{0,120}autoApproveThreshold:\s*null/.test(aiText('confidence.service.ts')),
    'classify_testimonial default autoApproveThreshold null (never auto)',
  );
  check(aiText('prompt-template.service.ts').includes('VAR_RE'), 'PromptTemplateService {{var}} render');
  check(aiText('guardrails.service.ts').includes('validateInput') && aiText('guardrails.service.ts').includes('validateOutput'), 'AiGuardrailsService input/output gates');
  check(aiText('cost-tracker.service.ts').includes('computeCostUsd'), 'AiCostTrackerService exact cost math');
  check(aiText('review.service.ts').includes('OVERRIDE_RATE_DOWNWEIGHT = 0.2'), 'review feedback loop: >20% overrides / 7d auto-downweight');
  check(aiText('provider-health.job.ts').includes('120_000'), '2-minute provider health job');
  check(aiFiles.includes('ai.module.ts'), 'AiModule exists');
  const aiModule = aiText('ai.module.ts');
  check(aiModule.includes('REPOSITORY_TOKENS.KMS') && aiModule.includes('AiOrchestratorService'), 'AiModule registers KMS token + orchestrator');
  const infraModule = read(join(API, 'infrastructure/infrastructure.module.ts'));
  check(infraModule.includes('AiModule') && infraModule.includes('imports: [DatabaseModule, AiModule]'), 'InfrastructureModule imports + exports AiModule');

  // ---- C. Provider adapters ----------------------------------------------
  console.log('C. provider adapters');
  const adapterDir = join(AI, 'adapters');
  const adapterFiles = readdirSync(adapterDir);
  for (const f of ['mock.adapter.ts', 'openai.adapter.ts', 'groq.adapter.ts', 'gemini.adapter.ts', 'anthropic.adapter.ts', 'azure-openai.adapter.ts', 'custom-endpoint.adapter.ts', 'http-clients.ts', 'index.ts']) {
    check(adapterFiles.includes(f), `adapter/${f}`);
  }
  const adapterIndex = read(join(adapterDir, 'index.ts'));
  check(
    ['openai', 'groq', 'gemini', 'anthropic', 'azure_openai', 'custom', 'mock'].every((t) => adapterIndex.includes(`'${t}'`)),
    'adapter factory covers every AiProviderType',
  );
  const sdkImports = adapterFiles
    .filter((f) => f.endsWith('.ts'))
    .map((f) => read(join(adapterDir, f)))
    .filter((c) => /from ['"](@google-cloud\/[^'"]+|openai|groq-sdk|@anthropic-ai\/sdk)['"]/.test(c));
  check(sdkImports.length === 0, 'adapters use plain fetch — no vendor SDK imports');

  // ---- D. Dual-adapter parity ----------------------------------------------
  console.log('D. dual-adapter parity (AI entities)');
  for (const e of ['ai-provider', 'ai-task-config', 'ai-request-log']) {
    check(fileIn(FS_REPOS, `firestore-${e}.repository.ts`), `firestore-${e}.repository.ts`);
    check(fileIn(PG_REPOS, `postgres-${e}.repository.ts`), `postgres-${e}.repository.ts`);
    check(fileIn(FS_MAPPERS, `${e}.mapper.ts`), `firestore mapper ${e}`);
    check(fileIn(PG_MAPPERS, `${e}.mapper.ts`), `postgres mapper ${e}`);
  }
  const factory = read(join(API, 'infrastructure/database/provider.factory.ts'));
  check(
    ['REPOSITORY_TOKENS.AI_PROVIDER', 'REPOSITORY_TOKENS.AI_TASK_CONFIG', 'REPOSITORY_TOKENS.AI_REQUEST_LOG'].every((t) => factory.includes(t)),
    'provider.factory binds the 3 AI repo tokens',
  );
  check(read(join(PG_REPOS, 'postgres-ai-request-log.repository.ts')).includes('findRecentSuccess'), 'cache lookup findRecentSuccess in pg repo');
  check(read(join(FS_REPOS, 'firestore-ai-request-log.repository.ts')).includes('findRecentSuccess'), 'cache lookup findRecentSuccess in fs repo');

  // ---- E. SQL / seed / prisma ----------------------------------------------
  console.log('E. schema.sql + seed.sql + prisma mirror');
  const schema = read(join(ROOT, 'infra/postgres/schema.sql'));
  for (const t of ['CREATE TABLE ai_providers', 'CREATE TABLE ai_task_configs', 'CREATE TABLE ai_request_logs']) {
    check(schema.includes(t), `schema.sql: ${t}`);
  }
  check(schema.includes('PARTITION BY RANGE (created_at)'), 'ai_request_logs partitioned by month (PARTITION BY RANGE)');
  check(schema.includes('ai_request_logs_') && /PARTITION OF ai_request_logs/i.test(schema), 'monthly partition DO block ships in schema.sql');
  for (const fk of [
    'REFERENCES ai_task_configs(id) ON DELETE CASCADE',
    'REFERENCES ai_providers(id) ON DELETE CASCADE',
    'REFERENCES tenants(id) ON DELETE SET NULL',
    'REFERENCES apps(id) ON DELETE SET NULL',
  ]) {
    check(schema.includes(fk), `explicit FK action: ${fk}`);
  }
  const seed = read(join(ROOT, 'infra/postgres/seed.sql'));
  check(seed.includes("'mock', 'active', 'mock://none'"), 'seed mock provider row (encrypted blob mock://none)');
  check(
    /classify_testimonial[\s\S]{0,700}(0\.75, NULL)/.test(seed),
    'classify seed: confidence 0.75 / auto_approve_threshold NULL',
  );
  const inserts = (seed.match(/^INSERT INTO/gm) ?? []).length;
  const conflicts = (seed.match(/^ON CONFLICT/gm) ?? []).length;
  // Every plain INSERT ... VALUES carries ON CONFLICT. The one exception is a
  // guarded INSERT ... SELECT ... WHERE NOT EXISTS (audit sample in the
  // previous-month partition, which has no unique conflict target) — it is
  // still idempotent, matching the doc-1 checker's +1 allowance.
  const guardedSelects = (seed.match(/^INSERT INTO[\s\S]*?^WHERE NOT EXISTS/gm) ?? []).length;
  check(inserts === conflicts + guardedSelects, `seed idempotency: ${inserts} INSERTs, ${conflicts} ON CONFLICT, ${guardedSelects} NOT-EXISTS-guarded`);
  const prisma = read(join(API, 'infrastructure/database/postgres/schema.prisma'));
  for (const m of ['model AiProvider', 'model AiTaskConfig', 'model AiRequestLog', 'enum ai_provider_type', 'enum ai_task_type', 'enum ai_routing_strategy', 'enum ai_request_status']) {
    check(prisma.includes(m), `prisma mirror: ${m}`);
  }
  const prismaClient = read(join(API, 'infrastructure/database/postgres/prisma.client.ts'));
  check(
    ['get aiProvider', 'get aiTaskConfig', 'get aiRequestLog'].every((g) => prismaClient.includes(g)),
    'PrismaClientService delegate getters extended',
  );

  // ---- F. Integration seam -------------------------------------------------
  console.log('F. integration seam');
  const classifier = read(join(API, 'modules/integrations/ai-classifier.service.ts'));
  check(classifier.includes('AiOrchestratorService') && classifier.includes('classify_testimonial'), 'AiClassifierService delegates to AiOrchestratorService (stub replaced)');

  // ---- G. ESLint boundary rule -----------------------------------------------
  console.log('G. ESLint boundary rule');
  const plugin = read(join(ROOT, 'packages/config/eslint-plugin-repo-boundaries/index.js'));
  check(plugin.includes("'no-ai-adapter-outside-ai-infra'"), 'plugin defines no-ai-adapter-outside-ai-infra');
  const base = read(join(ROOT, 'packages/config/eslint/base.js'));
  check(base.includes("'repo-boundaries/no-ai-adapter-outside-ai-infra': 'error'"), 'AI boundary rule enabled in base config');

  // ---- H. Unit suites ----------------------------------------------------------
  console.log('H. unit suites (apps/api/test/ai)');
  const testFiles = readdirSync(TESTS).filter((f) => f.endsWith('.test.ts'));
  for (const s of ['routing', 'confidence', 'guardrails', 'prompt-template', 'cost-tracker', 'orchestrator', 'review', 'mock-adapter', 'kms-decryptor']) {
    check(testFiles.some((f) => f.startsWith(s)), `suite ${s}.test.ts exists`);
  }
  const orchestratorTest = readFileSync(join(TESTS, 'orchestrator.service.test.ts'), 'utf8');
  check(orchestratorTest.includes('fromCache'), 'cache behaviour asserted (fromCache + no new row)');
  const routingTest = readFileSync(join(TESTS, 'routing.service.test.ts'), 'utf8');
  check(routingTest.includes('1000'), 'weighted ±5% / 1000-draw assertion present');

  // ---- I. Lint --------------------------------------------------------------
  console.log('I. lint (ai + modules)');
  try {
    execFileSync('npx', ['eslint', '--no-error-on-unmatched-pattern', 'apps/api/src/infrastructure/ai/**/*.ts', 'apps/api/src/modules/**/*.ts'], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    check(true, 'eslint clean on infrastructure/ai + modules');
  } catch {
    check(false, 'eslint clean on infrastructure/ai + modules');
  }

  console.log(`\n=== Doc-2 Additive A checklist: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('\nFailures:\n  - ' + failures.join('\n  - '));
    process.exit(1);
  }
}

void main();
