import { describe, expect, it, beforeEach } from 'vitest';
import { AiReviewService } from '../../src/infrastructure/ai/review.service';
import { FakeConfigRepo, FakeLogRepo, makeTaskConfig } from './fakes';
import type { AiRequestLog, CreateAiRequestLog } from '@testimonial-api/domain';

/**
 * Review service: human override/rating flows mutate the log row; the
 * feedback loop auto-downweights providers with >20% overrides over 7 days.
 */
let logRepo: FakeLogRepo;
let configRepo: FakeConfigRepo;
let review: AiReviewService;

beforeEach(() => {
  logRepo = new FakeLogRepo();
  configRepo = new FakeConfigRepo();
  review = new AiReviewService(logRepo, configRepo);
});

async function seedLog(partial: Partial<AiRequestLog> = {}): Promise<AiRequestLog> {
  const cfg = makeTaskConfig({ id: 'cfg-a', taskType: 'classify_testimonial', providerIds: ['prov-x'] });
  if (!configRepo.configs.some((c) => c.id === cfg.id)) configRepo.configs.push(cfg);
  return logRepo.create(
    ({
      taskConfigId: cfg.id,
      providerId: 'prov-x',
      model: 'mock-1',
      prompt: 'p',
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0,
      latencyMs: 5,
      rawResponse: '{"isSpam":false}',
      parsedResponse: { isSpam: false },
      confidenceScore: 0.9,
      status: 'success',
      errorMessage: null,
      tenantId: null,
      appId: null,
      ...partial,
    }) as CreateAiRequestLog,
  );
}

describe('AiReviewService.override / rateQuality / flag', () => {
  it('records an override with value and rating', async () => {
    const log = await seedLog();
    const updated = await review.override(log.id, 'true', 1);
    expect(updated.humanOverride).toBe(true);
    expect(updated.humanOverrideValue).toBe('true');
    expect(updated.qualityRating).toBe(1);
    expect(updated.status).toBe('human_override');
  });

  it('rates quality 1–5 without overriding', async () => {
    const log = await seedLog();
    const updated = await review.rateQuality(log.id, 5);
    expect(updated.qualityRating).toBe(5);
    expect(updated.humanOverride).toBe(false);
  });

  it('flags a row for human review', async () => {
    const log = await seedLog();
    const updated = await review.flag(log.id, 'borderline sentiment');
    expect(updated.status).toBe('low_confidence');
    expect(updated.errorMessage).toContain('borderline sentiment');
  });
});

describe('AiReviewService feedback loop (auto-downweight)', () => {
  it('does not downweight when overrides ≤ 20%', async () => {
    for (let i = 0; i < 10; i += 1) {
      await seedLog({ id: `s${i}` });
    }
    const report = await review.runFeedbackLoop('classify_testimonial', 'prov-x');
    expect(report.downweighted).toBe(false);
    expect(report.humanOverrideRate).toBe(0);
    expect(configRepo.configs.every((c) => Object.keys(c.providerWeights).length === 0)).toBe(true);
  });

  it('downweights (halves weight) when override rate > 20% over 7d', async () => {
    const cfg = makeTaskConfig({ id: 'cfg-w', taskType: 'classify_testimonial', providerIds: ['prov-x'], providerWeights: { 'prov-x': 1 } });
    configRepo.seed(cfg);
    for (let i = 0; i < 8; i += 1) await seedLog({ id: `ok${i}` });
    for (let i = 0; i < 4; i += 1) {
      const log = await seedLog({ id: `ovr${i}` });
      await review.override(log.id, 'human accepted');
    }
    const report = await review.runFeedbackLoop('classify_testimonial', 'prov-x');
    expect(report.downweighted).toBe(true);
    expect(report.humanOverrideRate).toBeGreaterThan(0.2);
    const updated = configRepo.configs.find((c) => c.id === 'cfg-w')!;
    expect(updated.providerWeights['prov-x']).toBe(0.5);
  });

  it('skips downweighting on tiny samples (<10 requests)', async () => {
    await seedLog({ id: 'only' });
    const report = await review.runFeedbackLoop('classify_testimonial', 'prov-x');
    expect(report.downweighted).toBe(false);
  });
});
