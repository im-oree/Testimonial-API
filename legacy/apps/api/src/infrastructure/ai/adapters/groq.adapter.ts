import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postChatCompletions, probeModelsUrl } from './http-clients';

export const GROQ_DEFAULT_BASE = 'https://api.groq.com/openai/v1';

/** Groq — OpenAI-compatible wire format on api.groq.com. */
export class GroqAdapter implements IAiProviderAdapter {
  readonly providerType = 'groq' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const url = `${baseUrl ?? GROQ_DEFAULT_BASE}/chat/completions`;
    const result = await postChatCompletions({ request, apiKey, url });
    return { ...result, model: request.model };
  }

  async isHealthy(apiKey: string, baseUrl?: string): Promise<boolean> {
    return probeModelsUrl({ url: `${baseUrl ?? GROQ_DEFAULT_BASE}/models`, apiKey, header: 'bearer' });
  }
}
