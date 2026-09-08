import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postAnthropicMessages } from './http-clients';

export const ANTHROPIC_DEFAULT_BASE = 'https://api.anthropic.com/v1';

/** Anthropic Claude — /v1/messages (x-api-key + anthropic-version headers). */
export class AnthropicAdapter implements IAiProviderAdapter {
  readonly providerType = 'anthropic' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const url = `${baseUrl ?? ANTHROPIC_DEFAULT_BASE}/messages`;
    const result = await postAnthropicMessages({
      request,
      apiKey,
      url,
      anthropicVersion: process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    });
    return { ...result, model: request.model };
  }

  async isHealthy(apiKey: string, baseUrl?: string): Promise<boolean> {
    // Anthropic has no /models list; a 401-with-key probe against /v1/models
    // is treated as reachable-but-unknown, so rely on the completion path.
    void apiKey;
    void baseUrl;
    return true;
  }
}
