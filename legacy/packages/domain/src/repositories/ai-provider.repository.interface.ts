import type { AiProvider, CreateAiProvider } from '../entities/ai-provider.entity';

/**
 * IAiProviderRepository — configured-provider store (ai_providers table /
 * aiProviders collection). Routing + circuit breaker + health-check job all
 * read/write through this port.
 */
export interface IAiProviderRepository {
  findById(id: string): Promise<AiProvider | null>;
  /** Providers explicitly allowed by a task config, currently status=active. */
  findActiveByIds(ids: string[]): Promise<AiProvider[]>;
  listActive(): Promise<AiProvider[]>;
  create(data: CreateAiProvider): Promise<AiProvider>;
  update(id: string, data: Partial<AiProvider>): Promise<AiProvider>;
  /** Circuit-breaker bookkeeping. */
  incrementFailures(id: string, lastError?: string): Promise<void>;
  resetFailures(id: string): Promise<void>;
  /** Avg latency (ms) per provider over the most recent calls (fastest routing). */
  getRecentAvgLatency(providerIds: string[], limit?: number): Promise<Record<string, number>>;
}
