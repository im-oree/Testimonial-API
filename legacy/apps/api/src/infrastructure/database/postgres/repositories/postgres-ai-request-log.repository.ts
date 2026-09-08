import { Injectable } from '@nestjs/common';
import type {
  AiCostSummary,
  AiQualityReport,
  AiRequestLog,
  CreateAiRequestLog,
  IAiRequestLogRepository,
} from '@testimonial-api/domain';
import type { AiTaskType } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AiRequestLogPgMappers } from '../mappers/ai-request-log.mapper';

@Injectable()
export class PostgresAiRequestLogRepository implements IAiRequestLogRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): AiRequestLog {
    return AiRequestLogPgMappers.toDomain(row as Record<string, unknown>) as AiRequestLog;
  }

  async create(data: CreateAiRequestLog): Promise<AiRequestLog> {
    const row = await this.prisma.aiRequestLog.create({
      data: AiRequestLogPgMappers.toPersistence(data as Partial<AiRequestLog>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<AiRequestLog>): Promise<AiRequestLog> {
    const row = await this.prisma.aiRequestLog.update({
      where: { id },
      data: AiRequestLogPgMappers.toPersistence(data) as never,
    });
    return this.toDomain(row);
  }

  async findRecentSuccess(taskConfigId: string, prompt: string, since: Date): Promise<AiRequestLog | null> {
    const row = await this.prisma.aiRequestLog.findFirst({
      where: { task_config_id: taskConfigId, prompt, status: 'success', created_at: { gte: since } },
      orderBy: { created_at: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async getCostAggregation(filters: {
    tenantId?: string;
    appId?: string;
    providerId?: string;
    taskType?: AiTaskType;
    dateRange?: [Date, Date];
  }): Promise<AiCostSummary> {
    const rows = (await this.prisma.aiRequestLog.findMany({
      where: this.buildWhere(filters),
      orderBy: { created_at: 'asc' },
    })) as unknown as Array<Record<string, unknown>>;

    // Map task_config_id → task_type + display name (models are relation-free,
    // so the join happens here in code).
    const configs = (await this.prisma.aiTaskConfig.findMany({})) as unknown as Array<{
      id: string;
      task_type: string;
      name: string;
    }>;
    const typeById = new Map(configs.map((c) => [c.id, c.task_type]));
    const nameById = new Map(configs.map((c) => [c.id, c.name]));

    const byProvider: Record<string, number> = {};
    const byTask: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const taskId = String(r.task_config_id ?? '');
      if (filters.taskType && typeById.get(taskId) !== filters.taskType) continue;
      const cost = Number(r.cost_usd ?? 0);
      total += cost;
      const providerId = String(r.provider_id ?? 'unknown');
      byProvider[providerId] = (byProvider[providerId] ?? 0) + cost;
      const taskLabel = nameById.get(taskId) ?? taskId;
      byTask[taskLabel] = (byTask[taskLabel] ?? 0) + cost;
      const d = r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at));
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      byDay[day] = (byDay[day] ?? 0) + cost;
    }
    return { totalCostUsd: total, byProvider, byTask, byDay };
  }

  async getQualityAggregation(providerId: string, _taskType: AiTaskType, days: number): Promise<AiQualityReport> {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.aiRequestLog.findMany({
      where: { provider_id: providerId, created_at: { gte: since } },
    });
    const totalRequests = rows.length;
    if (totalRequests === 0) {
      return { avgQualityRating: 0, humanOverrideRate: 0, avgConfidence: 0, totalRequests: 0 };
    }
    let ratingSum = 0;
    let rated = 0;
    let confSum = 0;
    let confCount = 0;
    let overrides = 0;
    for (const r of rows) {
      const domain = this.toDomain(r);
      if (domain.qualityRating !== null) {
        ratingSum += domain.qualityRating;
        rated += 1;
      }
      if (domain.confidenceScore !== null) {
        confSum += domain.confidenceScore;
        confCount += 1;
      }
      if (domain.humanOverride) overrides += 1;
    }
    return {
      avgQualityRating: rated ? ratingSum / rated : 0,
      humanOverrideRate: overrides / totalRequests,
      avgConfidence: confCount ? confSum / confCount : 0,
      totalRequests,
    };
  }

  private buildWhere(filters: {
    tenantId?: string;
    appId?: string;
    providerId?: string;
    dateRange?: [Date, Date];
  }): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];
    if (filters.providerId) and.push({ provider_id: filters.providerId });
    if (filters.appId) and.push({ app_id: filters.appId });
    if (filters.tenantId) and.push({ tenant_id: filters.tenantId });
    if (filters.dateRange) and.push({ created_at: { gte: filters.dateRange[0], lte: filters.dateRange[1] } });
    return and.length > 0 ? { AND: and } : {};
  }
}
