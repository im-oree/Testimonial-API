import type {
  AiCostSummary,
  AiQualityReport,
  AiRequestLog,
  CreateAiRequestLog,
} from '../entities/ai-request-log.entity';
import type { AiTaskType } from '../entities/ai-task-config.entity';

/**
 * IAiRequestLogRepository — append-mostly audit store for every AI call
 * (ai_request_logs, partitioned monthly in SQL). Drives cost dashboards,
 * quality reports and the human-review feedback loop.
 */
export interface IAiRequestLogRepository {
  create(data: CreateAiRequestLog): Promise<AiRequestLog>;
  update(id: string, data: Partial<AiRequestLog>): Promise<AiRequestLog>;
  /** Cache lookup: most recent success for the exact rendered prompt. */
  findRecentSuccess(taskConfigId: string, prompt: string, since: Date): Promise<AiRequestLog | null>;
  /** Cost aggregation for the "AI & Costs" dashboard. */
  getCostAggregation(filters: {
    tenantId?: string;
    appId?: string;
    providerId?: string;
    taskType?: AiTaskType;
    dateRange?: [Date, Date];
  }): Promise<AiCostSummary>;
  /** Quality report: drives the auto-downweight feedback loop. */
  getQualityAggregation(providerId: string, taskType: AiTaskType, days: number): Promise<AiQualityReport>;
}
