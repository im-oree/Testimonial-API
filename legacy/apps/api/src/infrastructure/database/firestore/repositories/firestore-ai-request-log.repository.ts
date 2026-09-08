import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS, type AiTaskType } from '@testimonial-api/domain';
import type {
  AiCostSummary,
  AiQualityReport,
  AiRequestLog,
  CreateAiRequestLog,
  IAiRequestLogRepository,
  IAiTaskConfigRepository,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { AiRequestLogFirestoreMapper } from '../mappers/ai-request-log.mapper';

@Injectable()
export class FirestoreAiRequestLogRepository
  extends FirestoreBaseRepository<AiRequestLog>
  implements IAiRequestLogRepository
{
  protected readonly collectionName = 'aiRequestLogs';
  protected readonly mapper = AiRequestLogFirestoreMapper;

  constructor(
    client: FirestoreClient,
    @Inject(REPOSITORY_TOKENS.AI_TASK_CONFIG) private readonly taskConfigs: IAiTaskConfigRepository,
  ) {
    super(client);
  }

  protected override defaultsFor(): Partial<AiRequestLog> {
    return {
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      rawResponse: null,
      parsedResponse: null,
      confidenceScore: null,
      errorMessage: null,
      humanOverride: false,
      humanOverrideValue: null,
      qualityRating: null,
      tenantId: null,
      appId: null,
    };
  }

  override create(data: CreateAiRequestLog): Promise<AiRequestLog> {
    return super.create(data as Partial<AiRequestLog> & { id?: string });
  }

  override update(id: string, data: Partial<AiRequestLog>): Promise<AiRequestLog> {
    return super.update(id, data);
  }

  async findRecentSuccess(taskConfigId: string, prompt: string, since: Date): Promise<AiRequestLog | null> {
    const all = await this.fetchAll('taskConfigId', taskConfigId);
    const hit = all
      .filter((l) => l.status === 'success' && l.prompt === prompt && l.createdAt.getTime() >= since.getTime())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return hit ?? null;
  }

  async getCostAggregation(filters: {
    tenantId?: string;
    appId?: string;
    providerId?: string;
    taskType?: AiTaskType;
    dateRange?: [Date, Date];
  }): Promise<AiCostSummary> {
    // Single-field equality lead query (auto single-field index), then
    // intersect remaining filters in memory — prototype-scale volumes.
    const lead =
      filters.providerId ?? filters.tenantId ?? filters.appId ?? null;
    let all: AiRequestLog[];
    if (lead) {
      const leadField = filters.providerId ? 'providerId' : filters.tenantId ? 'tenantId' : 'appId';
      all = await this.fetchAll(leadField, lead);
    } else {
      const snap = await this.col().get();
      all = snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
    }

    const typeById = new Map<string, string>();
    const nameById = new Map<string, string>();
    for (const cfg of await this.taskConfigs.listActive()) {
      typeById.set(cfg.id, cfg.taskType);
      nameById.set(cfg.id, cfg.name);
    }

    const byProvider: Record<string, number> = {};
    const byTask: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let total = 0;
    for (const r of all) {
      if (filters.providerId && r.providerId !== filters.providerId) continue;
      if (filters.tenantId && r.tenantId !== filters.tenantId) continue;
      if (filters.appId && r.appId !== filters.appId) continue;
      if (filters.dateRange) {
        const t = r.createdAt.getTime();
        if (t < filters.dateRange[0].getTime() || t > filters.dateRange[1].getTime()) continue;
      }
      const taskId = r.taskConfigId;
      if (filters.taskType && typeById.get(taskId) !== filters.taskType) continue;
      total += r.costUsd;
      byProvider[r.providerId] = (byProvider[r.providerId] ?? 0) + r.costUsd;
      byTask[nameById.get(taskId) ?? taskId] = (byTask[nameById.get(taskId) ?? taskId] ?? 0) + r.costUsd;
      const d = r.createdAt;
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      byDay[day] = (byDay[day] ?? 0) + r.costUsd;
    }
    return { totalCostUsd: total, byProvider, byTask, byDay };
  }

  async getQualityAggregation(providerId: string, _taskType: AiTaskType, days: number): Promise<AiQualityReport> {
    const since = new Date(Date.now() - days * 86_400_000);
    const all = await this.fetchAll('providerId', providerId);
    const recent = all.filter((l) => l.createdAt.getTime() >= since.getTime());
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
