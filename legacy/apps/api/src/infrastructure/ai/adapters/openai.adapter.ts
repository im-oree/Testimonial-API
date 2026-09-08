import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postChatCompletions, probeModelsUrl } from './http-clients';

export const OPENAI_DEFAULT_BASE = 'https://api.openai.com/v1';

export class OpenAIAdapter implements IAiProviderAdapter {
  readonly providerType = 'openai' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const url = `${baseUrl ?? OPENAI_DEFAULT_BASE}/chat/completions`;
    const result = await postChatCompletions({ request, apiKey, url });
    return { ...result, model: request.model };
  }

  async isHealthy(apiKey: string, baseUrl?: string): Promise<boolean> {
    return probeModelsUrl({ url: `${baseUrl ?? OPENAI_DEFAULT_BASE}/models`, apiKey, header: 'bearer' });
  }
}
