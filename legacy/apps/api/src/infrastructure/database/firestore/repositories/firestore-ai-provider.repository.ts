import { Injectable } from '@nestjs/common';
import type { AiProvider, IAiProviderRepository } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { AiProviderFirestoreMapper } from '../mappers/ai-provider.mapper';
import { AiRequestLogFirestoreMapper } from '../mappers/ai-request-log.mapper';

@Injectable()
export class FirestoreAiProviderRepository
  extends FirestoreBaseRepository<AiProvider>
  implements IAiProviderRepository
{
  protected readonly collectionName = 'aiProviders';
  protected readonly mapper = AiProviderFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(): Partial<AiProvider> {
    return {
      status: 'active',
      priority: 100,
      isFallback: false,
      maxTokensPerRequest: 2048,
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10_000,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      consecutiveFailures: 0,
      settings: {},
    };
  }

  async findActiveByIds(ids: string[]): Promise<AiProvider[]> {
    const found = await Promise.all(ids.map((id) => this.findById(id)));
    return found
      .filter((p): p is AiProvider => p !== null && p.status === 'active')
      .sort((a, b) => a.priority - b.priority);
  }

  async listActive(): Promise<AiProvider[]> {
    const all = await this.fetchAll('status', 'active');
    return all.sort((a, b) => a.priority - b.priority);
  }

  async incrementFailures(id: string, lastError?: string): Promise<void> {
    const existing = await this.findById(id);
    const next = (existing?.consecutiveFailures ?? 0) + 1;
    await this.update(id, {
      consecutiveFailures: next,
      lastError: lastError ?? existing?.lastError ?? null,
      lastErrorAt: new Date(),
    } as Partial<AiProvider>);
  }

  async resetFailures(id: string): Promise<void> {
    await this.update(id, {
      consecutiveFailures: 0,
      lastError: null,
      status: 'active',
    } as Partial<AiProvider>);
  }

  async getRecentAvgLatency(providerIds: string[], limit = 100): Promise<Record<string, number>> {
    const logs = this.client.db.collection('aiRequestLogs');
    const out: Record<string, number> = {};
    for (const id of providerIds) {
      const snap = await logs.where('providerId', '==', id).get();
      const successes = snap.docs
        .map((d) => AiRequestLogFirestoreMapper.toDomain({ id: d.id, data: d.data() }))
        .filter((l) => l.status === 'success')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
      if (successes.length === 0) {
        out[id] = Number.POSITIVE_INFINITY;
        continue;
      }
      out[id] = successes.reduce((sum, l) => sum + l.latencyMs, 0) / successes.length;
    }
    return out;
  }
}
