import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { estimateTokens } from '../utils';

/**
 * MockAdapter — deterministic, offline provider used for EVERY non-AI test
 * suite and as the seeded dev provider (zero real-LLM cost in CI).
 *
 * Behaviour is derived from the rendered prompt so orchestrator/e2e tests
 * exercise the real contract:
 *  • the testimonial text (between """ delimiters in the templates) is
 *    echoed back into outputs that carry it (cleanedQuote, summary, …)
 *  • JSON task outputs mirror the schema keywords in the prompt template
 *  • simple keyword heuristics drive sentiment (worst/bad → 1) and spam
 *    ("http", "buy now", "FREE" inside the post → spam)
 *
 * Settings knobs (provider.settings, used by failure-mode tests):
 *  settings.mockScenario: 'ok' | 'fail' | 'timeout' | 'rate_limited'
 */
export class MockAdapter implements IAiProviderAdapter {
  readonly providerType = 'mock' as const;

  private scenarioFor(request: AiCompletionRequest): string {
    return String((request.responseSchema as { mockScenario?: string } | undefined)?.mockScenario ?? 'ok');
  }

  async complete(request: AiCompletionRequest, _apiKey?: string, _baseUrl?: string): Promise<AiCompletionResponse> {
    const scenario = this.scenarioFor(request);
    if (scenario === 'fail') throw new Error('mock provider forced failure');
    if (scenario === 'timeout') {
      throw new Error('mock provider forced timeout');
    }
    if (scenario === 'rate_limited') {
      const err = new Error('mock provider rate limited');
      (err as Error & { statusCode?: number }).statusCode = 429;
      throw err;
    }
    const started = Date.now();
    const content = this.render(request.prompt);
    return {
      content,
      inputTokens: estimateTokens(request.prompt),
      outputTokens: estimateTokens(content),
      model: request.model,
      finishReason: 'stop',
      latencyMs: Math.max(1, Date.now() - started),
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  /** Deterministic JSON/text answer derived from the prompt. */
  private render(prompt: string): string {
    const quoted = this.extractQuoted(prompt);
    const negative = /(\bworst\b|\bterrible\b|\bawful\b|\bhate\b|\bhorrible\b|\b1 star\b)/i.test(quoted);
    const spammy =
      /(http:\/\/|https:\/\/|www\.|\bbuy now\b|\bfree\b|\bclick here\b)/i.test(prompt) &&
      /(spam|isSpam)/i.test(prompt);

    if (/isGenuineTestimonial/.test(prompt)) {
      return JSON.stringify({
        isGenuineTestimonial: !spammy,
        isSpam: spammy,
        sentimentScore: negative ? 1 : 5,
        cleanedQuote: quoted || 'Loved it — highly recommended!',
        confidence: 0.95,
        language: 'en',
      });
    }
    if (/isSpam/.test(prompt)) {
      return JSON.stringify({
        isSpam: spammy,
        confidence: spammy ? 0.97 : 0.12,
        reason: spammy ? 'link/promo pattern detected' : 'clean user content',
      });
    }
    if (/sentimentScore/.test(prompt)) {
      return JSON.stringify({ sentimentScore: negative ? 1 : 5, confidence: 0.9 });
    }
    if (/summary/.test(prompt)) {
      return JSON.stringify({
        summary: quoted ? `"${quoted.slice(0, 120)}"` : 'A short customer endorsement.',
        confidence: 0.9,
      });
    }
    if (/reply/.test(prompt)) {
      return JSON.stringify({
        reply: 'Thank you so much for your kind words — we truly appreciate it!',
        confidence: 0.9,
      });
    }
    if (/Translate|translate/.test(prompt)) {
      return JSON.stringify({ translation: quoted || '', confidence: 0.95 });
    }
    return JSON.stringify({ ok: true, confidence: 1 });
  }

  private extractQuoted(prompt: string): string {
    const match = prompt.match(/"""([\s\S]*?)"""/);
    return match ? match[1].trim() : '';
  }
}
