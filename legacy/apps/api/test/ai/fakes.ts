import type {
  AiCostSummary,
  AiProvider,
  AiProviderStatus,
  AiQualityReport,
  AiRequestLog,
  AiRequestStatus,
  AiTaskConfig,
  AiTaskType,
  CreateAiProvider,
  CreateAiRequestLog,
  IAiProviderRepository,
  IAiRequestLogRepository,
  IAiTaskConfigRepository,
  IKmsDecryptor,
} from '@testimonial-api/domain';

// ============================================================
// In-memory fakes for the AI engine unit suites. No Firestore/Postgres —
// these suites prove engine behaviour (routing, confidence, guardrails,
// orchestrator, review), which the dual adapters exercise separately.
// ============================================================

let seq = 0;
export const nextId = (prefix = 'id'): string => `${prefix}-${(seq += 1)}`;

export function makeProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    id: nextId('prov'),
    name: 'Mock Provider',
    type: 'mock',
    status: 'active',
    apiKeyEncrypted: 'mock://none',
    baseUrl: null,
    defaultModel: 'mock-1',
    maxTokensPerRequest: 1024,
    rateLimitPerMinute: 100000,
    rateLimitPerDay: 1000000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    priority: 10,
    isFallback: false,
    settings: { temperature: 0 },
    lastErrorAt: null,
    lastError: null,
    consecutiveFailures: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeTaskConfig(overrides: Partial<AiTaskConfig> = {}): AiTaskConfig {
  return {
    id: nextId('cfg'),
    taskType: 'classify_testimonial',
    name: 'Classify',
    promptTemplate: 'You are reviewing: """{{text}}""" about {{brandName}}. Return JSON with isSpam, confidence.',
    responseSchema: { type: 'object' },
    routingStrategy: 'failover',
    providerIds: [],
    providerWeights: {},
    confidenceThreshold: 0.75,
    autoApproveThreshold: null,
    maxRetries: 2,
    timeoutMs: 10000,
    cacheTtlSeconds: 3600,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export class FakeProviderRepo implements IAiProviderRepository {
  providers: AiProvider[] = [];

  seed(...providers: AiProvider[]): void {
    this.providers = [...providers];
  }

  async findById(id: string): Promise<AiProvider | null> {
    return this.providers.find((p) => p.id === id) ?? null;
  }

  async findActiveByIds(ids: string[]): Promise<AiProvider[]> {
    return this.providers.filter((p) => ids.includes(p.id) && p.status === 'active');
  }

  async listActive(): Promise<AiProvider[]> {
    return this.providers.filter((p) => p.status === 'active');
  }

  async create(data: CreateAiProvider): Promise<AiProvider> {
    const p = makeProvider(data);
    this.providers.push(p);
    return p;
  }

  async update(id: string, data: Partial<AiProvider>): Promise<AiProvider> {
    const idx = this.providers.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`missing ${id}`);
    this.providers[idx] = { ...this.providers[idx], ...data, updatedAt: new Date() };
    return this.providers[idx];
  }

  async incrementFailures(id: string, lastError?: string): Promise<void> {
    const idx = this.providers.findIndex((p) => p.id === id);
    if (idx === -1) return;
    this.providers[idx] = {
      ...this.providers[idx],
      consecutiveFailures: this.providers[idx].consecutiveFailures + 1,
      lastError: lastError ?? null,
      lastErrorAt: new Date(),
    };
  }

  async resetFailures(id: string): Promise<void> {
    const idx = this.providers.findIndex((p) => p.id === id);
    if (idx === -1) return;
    this.providers[idx] = {
      ...this.providers[idx],
      consecutiveFailures: 0,
      lastError: null,
      status: 'active' as AiProviderStatus,
    };
  }

  async getRecentAvgLatency(providerIds: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of providerIds) out[id] = 100;
    return out;
  }
}

export class FakeConfigRepo implements IAiTaskConfigRepository {
  configs: AiTaskConfig[] = [];

  seed(...configs: AiTaskConfig[]): void {
    this.configs = [...configs];
  }

  async findById(id: string): Promise<AiTaskConfig | null> {
    return this.configs.find((c) => c.id === id) ?? null;
  }

  async findByTaskType(taskType: AiTaskType): Promise<AiTaskConfig | null> {
    return this.configs.find((c) => c.taskType === taskType) ?? null;
  }

  async listActive(): Promise<AiTaskConfig[]> {
    return this.configs.filter((c) => c.isActive);
  }

  async create(data: Partial<AiTaskConfig>): Promise<AiTaskConfig> {
    const c = makeTaskConfig(data as AiTaskConfig);
    this.configs.push(c);
    return c;
  }

  async update(id: string, data: Partial<AiTaskConfig>): Promise<AiTaskConfig> {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`missing config ${id}`);
    this.configs[idx] = { ...this.configs[idx], ...data };
    return this.configs[idx];
  }
}

export class FakeLogRepo implements IAiRequestLogRepository {
  logs: AiRequestLog[] = [];

  async create(data: CreateAiRequestLog): Promise<AiRequestLog> {
    const log: AiRequestLog = {
      ...data,
      id: nextId('log'),
      createdAt: new Date(),
      humanOverride: false,
      humanOverrideValue: null,
      qualityRating: null,
    };
    this.logs.push(log);
    return log;
  }

  async update(id: string, data: Partial<AiRequestLog>): Promise<AiRequestLog> {
    const idx = this.logs.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error(`missing log ${id}`);
    this.logs[idx] = { ...this.logs[idx], ...data };
    return this.logs[idx];
  }

  async findRecentSuccess(taskConfigId: string, prompt: string, since: Date): Promise<AiRequestLog | null> {
    const hit = this.logs
      .filter((l) => l.taskConfigId === taskConfigId && l.prompt === prompt && l.status === 'success' && l.createdAt.getTime() >= since.getTime())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return hit ?? null;
  }

  async getCostAggregation(): Promise<AiCostSummary> {
    return { totalCostUsd: 0, byProvider: {}, byTask: {}, byDay: {} };
  }

  async getQualityAggregation(providerId: string, _taskType: AiTaskType, days: number): Promise<AiQualityReport> {
    const since = new Date(Date.now() - days * 86_400_000);
    const recent = this.logs.filter((l) => l.providerId === providerId && l.createdAt.getTime() >= since.getTime());
    const totalRequests = recent.length;
    if (totalRequests === 0) {
      return { avgQualityRating: 0, humanOverrideRate: 0, avgConfidence: 0, totalRequests: 0 };
    }
    let ratingSum = 0;
    let rated = 0;
    let confSum = 0;
    let confCount = 0;
    let overrides = 0;
    for (const log of recent) {
      if (log.qualityRating !== null) {
        ratingSum += log.qualityRating;
        rated += 1;
      }
      if (log.confidenceScore !== null) {
        confSum += log.confidenceScore;
        confCount += 1;
      }
      if (log.humanOverride) overrides += 1;
    }
    return {
      avgQualityRating: rated ? ratingSum / rated : 0,
      humanOverrideRate: overrides / totalRequests,
      avgConfidence: confCount ? confSum / confCount : 0,
      totalRequests,
    };
  }
}

export class FakeKms implements IKmsDecryptor {
  async decrypt(blob: string): Promise<string> {
    if (blob.startsWith('mock://')) return blob;
    if (blob.startsWith('plain:')) return blob.slice('plain:'.length);
    throw new Error('fake kms: unknown blob');
  }
}
