import { Injectable } from '@nestjs/common';
import type { AiDecision, AiTaskConfig } from '@testimonial-api/domain';

/**
 * ConfidenceService — scoring + decision policy for parsed AI outputs.
 *
 * Decision ladder (single source of truth):
 *   1. confidence < REJECT_FLOOR (0.30)             → 'reject'
 *   2. autoApproveThreshold configured AND reached   → 'auto'   (trust metadata)
 *   3. otherwise                                    → 'human_review'
 *
 * Safe defaults (mirrored in infra/postgres/seed.sql §AI task configs):
 *   detect_spam          threshold 0.80, auto 0.95
 *   classify_testimonial threshold 0.75, auto null ← NEVER auto-approves:
 *                      social imports always land in the human moderation queue.
 *
 * autoApproveThreshold === null is a HARD "no auto" for that task — the
 * service refuses to treat null as "no limit".
 */
export const CONFIDENCE_REJECT_FLOOR = 0.3;

export interface DefaultsRow {
  confidenceThreshold: number;
  autoApproveThreshold: number | null;
}

/** Documented defaults table (also enforced by tests). */
export const CONFIDENCE_DEFAULTS: Record<string, DefaultsRow> = {
  classify_testimonial: { confidenceThreshold: 0.75, autoApproveThreshold: null },
  detect_spam: { confidenceThreshold: 0.8, autoApproveThreshold: 0.95 },
  summarize: { confidenceThreshold: 0.65, autoApproveThreshold: null },
  generate_reply: { confidenceThreshold: 0.65, autoApproveThreshold: null },
};

export interface ConfidenceDecision {
  confidence: number;
  decision: AiDecision;
  /** Why the decision was taken (audit + tests). */
  basis: string;
}

@Injectable()
export class ConfidenceService {
  /** Extract a 0..1 confidence from parsed model output, or null. */
  scoreOf(parsed: Record<string, unknown>): number | null {
    const raw = parsed.confidence ?? parsed.confidenceScore;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return null;
    return Math.min(1, Math.max(0, raw));
  }

  decide(parsed: Record<string, unknown>, cfg: Pick<AiTaskConfig, 'confidenceThreshold' | 'autoApproveThreshold'>): ConfidenceDecision {
    const score = this.scoreOf(parsed);
    const confidence = score ?? 0.5;
    if (score === null) {
      return { confidence, decision: 'human_review', basis: 'no confidence field in model output' };
    }
    if (confidence < CONFIDENCE_REJECT_FLOOR) {
      return { confidence, decision: 'reject', basis: `below reject floor ${CONFIDENCE_REJECT_FLOOR}` };
    }
    const autoApprove = cfg.autoApproveThreshold;
    if (autoApprove !== null && confidence >= autoApprove) {
      return { confidence, decision: 'auto', basis: `at or above auto-approve ${autoApprove}` };
    }
    if (confidence >= cfg.confidenceThreshold) {
      return { confidence, decision: 'human_review', basis: `above threshold ${cfg.confidenceThreshold}, auto ${autoApprove === null ? 'disabled' : `at ${autoApprove}`}` };
    }
    return { confidence, decision: 'human_review', basis: `between floor and threshold ${cfg.confidenceThreshold}` };
  }
}
