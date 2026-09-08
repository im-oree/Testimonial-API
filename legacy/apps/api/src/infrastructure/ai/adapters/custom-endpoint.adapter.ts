import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postChatCompletions, probeModelsUrl } from './http-clients';

/**
 * Custom OpenAI-compatible endpoint (self-hosted vLLM/Ollama gateways, etc.).
 * base_url is REQUIRED; the request model is passed straight through.
 */
export class CustomEndpointAdapter implements IAiProviderAdapter {
  readonly providerType = 'custom' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const customBase = (baseUrl ?? '').replace(/\/$/, '');
    if (!customBase) {
      throw new Error('custom provider requires base_url');
    }
    const url = `${customBase}/chat/completions`;
    const result = await postChatCompletions({ request, apiKey, url });
    return { ...result, model: request.model };
  }

  async isHealthy(apiKey: string, baseUrl?: string): Promise<boolean> {
    const customBase = (baseUrl ?? '').replace(/\/$/, '');
    if (!customBase) return false;
    return probeModelsUrl({ url: `${customBase}/models`, apiKey, header: 'bearer' });
  }
}
