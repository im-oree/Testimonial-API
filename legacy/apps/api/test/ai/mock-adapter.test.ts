import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../../src/infrastructure/ai/adapters/mock.adapter';
import type { AiCompletionRequest } from '@testimonial-api/domain';

/**
 * MockAdapter — deterministic offline provider. Its outputs must mirror the
 * seeded prompt templates so orchestrator tests assert on REAL contracts.
 */
const adapter = new MockAdapter();

function request(prompt: string, extra: Partial<AiCompletionRequest> = {}): AiCompletionRequest {
  return { model: 'mock-1', prompt, maxTokens: 1024, temperature: 0, ...extra };
}

describe('MockAdapter', () => {
  it('classifies a clean testimonial deterministically (JSON schema path)', async () => {
    const res = await adapter.complete(
      request('Return JSON {isGenuineTestimonial,isSpam,sentimentScore,cleanedQuote,confidence}: """Absolutely loved the product!"""'),
      'mock://none',
    );
    const parsed = JSON.parse(res.content) as Record<string, unknown>;
    expect(parsed.isGenuineTestimonial).toBe(true);
    expect(parsed.isSpam).toBe(false);
    expect(parsed.confidence).toBe(0.95);
    expect(parsed.cleanedQuote).toContain('Absolutely loved');
  });

  it('flags spammy/link content as spam with high confidence', async () => {
    const res = await adapter.complete(
      request('Return JSON {isSpam, confidence, reason}: """WIN a FREE iPhone now at http://scam.example/buy"""'),
      'mock://none',
    );
    const parsed = JSON.parse(res.content) as Record<string, unknown>;
    expect(parsed.isSpam).toBe(true);
  });

  it('extracts a negative sentiment for complaint keywords', async () => {
    const res = await adapter.complete(
      request('Return JSON {sentimentScore, confidence}: """worst support I ever had"""'),
      'mock://none',
    );
    const parsed = JSON.parse(res.content) as Record<string, unknown>;
    expect(parsed.sentimentScore).toBe(1);
  });

  it('can be forced into failure scenarios for tests', async () => {
    const req = request('x', { responseSchema: { mockScenario: 'fail' } });
    await expect(adapter.complete(req, 'mock://none')).rejects.toThrow('forced failure');
  });

  it('reports healthy', async () => {
    await expect(adapter.isHealthy()).resolves.toBe(true);
  });
});
