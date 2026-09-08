import type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from '@testimonial-api/domain';
import { postChatCompletions } from './http-clients';

/**
 * Azure OpenAI adapter. The Azure resource URL encodes the deployment:
 *   baseUrl: https://<resource>.openai.azure.com/openai/deployments/<deployment>
 * The model (request.model) is informational; the deployment is the route.
 * Auth is the resource key header (api-key) rather than a bearer token.
 */
export class AzureOpenAIAdapter implements IAiProviderAdapter {
  readonly providerType = 'azure_openai' as const;

  async complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse> {
    const azureBase = (baseUrl ?? process.env.AZURE_OPENAI_BASE_URL ?? '').replace(/\/$/, '');
    if (!azureBase) {
      throw new Error('AzureOpenAI requires base_url (https://<resource>.openai.azure.com/openai/deployments/<deployment>)');
    }
    const url = `${azureBase}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION ?? '2024-06-01'}`;
    const result = await postChatCompletions({
      request,
      apiKey,
      url,
      extraHeaders: { 'api-key': apiKey, authorization: '' },
    });
    return { ...result, model: request.model };
  }

  async isHealthy(_apiKey: string, baseUrl?: string): Promise<boolean> {
    return Boolean(baseUrl); // liveness is confirmed by real completions
  }
}
