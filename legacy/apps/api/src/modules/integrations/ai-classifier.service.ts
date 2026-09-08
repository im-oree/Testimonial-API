import { Injectable, Logger } from '@nestjs/common';
import type { AiDecision } from '@testimonial-api/domain';
import { AiOrchestratorService, type AiTaskInput } from '../../infrastructure/ai';

/**
 * AiClassifierService — classification of imported testimonials/social
 * mentions (README §17.1). Replaced the Doc-1 stub: it now delegates to
 * AiOrchestratorService.executeTask — the single AI entry point — exactly
 * as the moderation/social-import engines will (Doc 2 core). Confidence is
 * surfaced so human moderators can triage; the hard "classify_testimonial
 * never auto-approves" rule lives in the task config (autoApproveThreshold
 * null) and returns decision 'human_review' for social imports.
 */
export interface ClassifierInput {
  text: string;
  brandName: string;
  authorName?: string;
  tenantId?: string | null;
  appId?: string | null;
}

export interface ClassifierOutput {
  isGenuineTestimonial: boolean;
  isSpam: boolean;
  sentimentScore: number;
  cleanedQuote: string | null;
  language: string | null;
  confidence: number;
  decision: AiDecision;
  providerUsed: string;
  modelUsed: string;
  costUsd: number;
  latencyMs: number;
  fromCache: boolean;
}

@Injectable()
export class AiClassifierService {
  private readonly logger = new Logger(AiClassifierService.name);

  constructor(private readonly orchestrator: AiOrchestratorService) {}

  async classify(input: ClassifierInput): Promise<ClassifierOutput> {
    const taskInput: AiTaskInput = {
      taskType: 'classify_testimonial',
      tenantId: input.tenantId ?? null,
      appId: input.appId ?? null,
      vars: {
        text: input.text,
        brandName: input.brandName,
        authorName: input.authorName ?? 'anonymous',
      },
    };
    const result = await this.orchestrator.executeTask(taskInput);
    return {
      isGenuineTestimonial: result.parsed.isGenuineTestimonial === true,
      isSpam: result.parsed.isSpam === true,
      sentimentScore: this.asScore(result.parsed.sentimentScore),
      cleanedQuote: this.asStringOrNull(result.parsed.cleanedQuote),
      language: this.asStringOrNull(result.parsed.language),
      confidence: result.confidenceScore,
      decision: result.decision,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
      fromCache: result.fromCache,
    };
  }

  private asScore(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private asStringOrNull(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
}
