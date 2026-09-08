import { Injectable } from '@nestjs/common';
import type { AiProvider, CreateAiProvider, IAiProviderRepository } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AiProviderPgMappers } from '../mappers/ai-provider.mapper';

@Injectable()
export class PostgresAiProviderRepository implements IAiProviderRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): AiProvider {
    return AiProviderPgMappers.toDomain(row as Record<string, unknown>) as AiProvider;
  }

  async findById(id: string): Promise<AiProvider | null> {
    const row = await this.prisma.aiProvider.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByIds(ids: string[]): Promise<AiProvider[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.aiProvider.findMany({
      where: { id: { in: ids }, status: 'active' },
      orderBy: { priority: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listActive(): Promise<AiProvider[]> {
    const rows = await this.prisma.aiProvider.findMany({
      where: { status: 'active' },
      orderBy: { priority: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreateAiProvider): Promise<AiProvider> {
    const row = await this.prisma.aiProvider.create({
      data: AiProviderPgMappers.toPersistence(data as Partial<AiProvider>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<AiProvider>): Promise<AiProvider> {
    const row = await this.prisma.aiProvider.update({
      where: { id },
      data: { ...AiProviderPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async incrementFailures(id: string, lastError?: string): Promise<void> {
    await this.prisma.aiProvider.update({
      where: { id },
      data: { consecutive_failures: { increment: 1 }, last_error_at: new Date(), last_error: lastError ?? null },
    });
  }

  async resetFailures(id: string): Promise<void> {
    await this.prisma.aiProvider.update({
      where: { id },
      data: { consecutive_failures: 0, last_error: null, status: 'active' },
    });
  }

  /** Avg success latency per provider (fastest routing). */
  async getRecentAvgLatency(providerIds: string[], _limit = 100): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of providerIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg = (await this.prisma.aiRequestLog.aggregate({
        where: { provider_id: id, status: 'success' },
        _avg: { latency_ms: true },
      })) as unknown as { _avg?: { latency_ms?: number | null } };
      out[id] = agg._avg?.latency_ms ?? Number.POSITIVE_INFINITY;
    }
    return out;
  }
}
