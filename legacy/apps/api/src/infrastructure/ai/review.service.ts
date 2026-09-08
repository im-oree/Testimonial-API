import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REPOSITORY_TOKENS,
  type AiQualityReport,
  type AiRequestLog,
  type AiTaskType,
  type IAiRequestLogRepository,
  type IAiTaskConfigRepository,
} from '@testimonial-api/domain';

/**
 * AiReviewService — human-in-the-loop over AI outputs (README §17.x):
 *   flag / override / rateQuality mutate the ai_request_logs row; the
 *   feedback loop auto-DOWNWEIGHTS a provider whose last-7-day outputs were
 *   overridden >20% of the time (per task type). Downweighting halves the
 *   provider's weight in every weighted-routing config that includes it and
 *   stamps settings.qualityDownweighted for dashboards.
 */
export const OVERRIDE_RATE_DOWNWEIGHT = 0.2; // >20% overrides / 7d
export const DOWNWEIGHT_FACTOR = 0.5;

export interface FeedbackReport extends AiQualityReport {
  downweighted: boolean;
  reason: string | null;
}

@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.AI_REQUEST_LOG) private readonly logs: IAiRequestLogRepository,
    @Inject(REPOSITORY_TOKENS.AI_TASK_CONFIG) private readonly configs: IAiTaskConfigRepository,
  ) {}

  /** Flag a log row for human review (does not change the outcome). */
  async flag(logId: string, reason?: string): Promise<AiRequestLog> {
    return this.logs.update(logId, {
      status: 'low_confidence',
      errorMessage: reason ? `flagged for review: ${reason}` : 'flagged for review',
    });
  }

  /** Human override of the model decision. */
  async override(logId: string, humanValue: string, qualityRating?: number): Promise<AiRequestLog> {
    return this.logs.update(logId, {
      humanOverride: true,
      humanOverrideValue: humanValue,
      qualityRating: qualityRating ?? null,
      status: 'human_override',
    });
  }

  /** Rate output quality (1–5) without overriding. */
  async rateQuality(logId: string, rating: number): Promise<AiRequestLog> {
    return this.logs.update(logId, { qualityRating: rating });
  }

  /**
   * Feedback loop check + apply. Call after each human override batch.
   * Downweights when provider's 7-day override rate for a task > 20%.
   */
  async runFeedbackLoop(taskType: AiTaskType, providerId: string): Promise<FeedbackReport> {
    const report = await this.logs.getQualityAggregation(providerId, taskType, 7);
    if (report.totalRequests < 10) {
      return { ...report, downweighted: false, reason: 'sample too small (<10 requests)' };
    }
    if (report.humanOverrideRate <= OVERRIDE_RATE_DOWNWEIGHT) {
      return { ...report, downweighted: false, reason: 'override rate within tolerance' };
    }
    await this.downweight(providerId, taskType);
    return {
      ...report,
      downweighted: true,
      reason: `override rate ${(report.humanOverrideRate * 100).toFixed(1)}% > 20% over 7d — provider downweighted`,
    };
  }

  private async downweight(providerId: string, taskType: AiTaskType): Promise<void> {
    const affected = (await this.configs.listActive()).filter((c) => c.taskType === taskType && c.providerIds.includes(providerId));
    for (const config of affected) {
      const weights = { ...config.providerWeights };
      const current = weights[providerId] ?? 1;
      weights[providerId] = Number((current * DOWNWEIGHT_FACTOR).toFixed(4));
      await this.configs.update(config.id, { providerWeights: weights });
      this.logger.warn(
        `AI provider ${providerId} downweighted for task ${taskType} (${config.name}): weight ${current} → ${weights[providerId]}`,
      );
    }
  }
}
