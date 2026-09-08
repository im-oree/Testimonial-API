import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postGeminiGenerateContent, probeModelsUrl } from './http-clients';

export const GEMINI_DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Google Gemini — generateContent REST (model encoded in the path). */
export class GeminiAdapter implements IAiProviderAdapter {
  readonly providerType = 'gemini' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const url = `${baseUrl ?? GEMINI_DEFAULT_BASE}/models/${encodeURIComponent(request.model)}:generateContent`;
    const result = await postGeminiGenerateContent({ request, apiKey, url });
    return { ...result, model: request.model };
  }

  async isHealthy(apiKey: string, baseUrl?: string): Promise<boolean> {
    return probeModelsUrl({ url: `${baseUrl ?? GEMINI_DEFAULT_BASE}/models`, apiKey, header: 'x-goog-api-key' });
  }
}
