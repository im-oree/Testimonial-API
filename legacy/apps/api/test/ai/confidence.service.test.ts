import { describe, expect, it } from 'vitest';
import { ConfidenceService, CONFIDENCE_REJECT_FLOOR, CONFIDENCE_DEFAULTS } from '../../src/infrastructure/ai/confidence.service';

/**
 * Confidence decision policy tests. Hard rules from Doc 2 Additive A:
 *  • confidence < 0.3 ⇒ reject
 *  • classify_testimonial autoApproveThreshold = null ⇒ NEVER 'auto'
 *  • detect_spam defaults 0.80 / auto 0.95
 */
const service = new ConfidenceService();

describe('ConfidenceService.scoreOf', () => {
  it('clamps to 0..1 and rejects NaN', () => {
    expect(service.scoreOf({ confidence: 0.9 })).toBe(0.9);
    expect(service.scoreOf({ confidence: 1.7 })).toBe(1);
    expect(service.scoreOf({ confidence: -0.4 })).toBe(0);
    expect(service.scoreOf({})).toBeNull();
    expect(service.scoreOf({ confidenceScore: 0.5 })).toBe(0.5);
  });
});

describe('ConfidenceService.decide boundaries', () => {
  it('rejects below the 0.3 floor', () => {
    const d = service.decide({ confidence: 0.2 }, makeCfg(0.75, 0.9));
    expect(d.decision).toBe('reject');
  });

  it('auto only when autoApproveThreshold is reached', () => {
    const d = service.decide({ confidence: 0.96 }, makeCfg(0.8, 0.95));
    expect(d.decision).toBe('auto');
  });

  it('human_review between threshold and autoApprove', () => {
    const d = service.decide({ confidence: 0.85 }, makeCfg(0.8, 0.95));
    expect(d.decision).toBe('human_review');
  });

  it('classify_testimonial never auto-approves (autoApproveThreshold null)', () => {
    const cfg = {
      confidenceThreshold: CONFIDENCE_DEFAULTS.classify_testimonial.confidenceThreshold,
      autoApproveThreshold: CONFIDENCE_DEFAULTS.classify_testimonial.autoApproveThreshold,
    };
    expect(cfg.autoApproveThreshold).toBeNull();
    const d = service.decide({ confidence: 0.99 }, cfg);
    expect(d.decision).toBe('human_review');
  });

  it('detect_spam defaults to 0.80 threshold / 0.95 auto', () => {
    expect(CONFIDENCE_DEFAULTS.detect_spam.confidenceThreshold).toBe(0.8);
    expect(CONFIDENCE_DEFAULTS.detect_spam.autoApproveThreshold).toBe(0.95);
    expect(service.decide({ confidence: 0.8 }, CONFIDENCE_DEFAULTS.detect_spam).decision).toBe('human_review');
    expect(service.decide({ confidence: 0.95 }, CONFIDENCE_DEFAULTS.detect_spam).decision).toBe('auto');
  });

  it('missing confidence field routes to human review, not auto', () => {
    const d = service.decide({ isSpam: false }, makeCfg(0.7, 0.9));
    expect(d.decision).toBe('human_review');
  });

  it('reject floor is exactly 0.3', () => {
    expect(CONFIDENCE_REJECT_FLOOR).toBe(0.3);
    expect(service.decide({ confidence: 0.299 }, makeCfg(0.7, 0.9)).decision).toBe('reject');
    expect(service.decide({ confidence: 0.3 }, makeCfg(0.7, 0.9)).decision).not.toBe('reject');
  });
});

function makeCfg(confidenceThreshold: number, autoApproveThreshold: number | null) {
  return { confidenceThreshold, autoApproveThreshold };
}
