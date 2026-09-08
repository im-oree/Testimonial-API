import type { IAiProviderAdapter, AiProviderType } from '@testimonial-api/domain';
import { MockAdapter } from './mock.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { GroqAdapter } from './groq.adapter';
import { AzureOpenAIAdapter } from './azure-openai.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { CustomEndpointAdapter } from './custom-endpoint.adapter';

/**
 * Adapter factory — one adapter instance per provider type. Adapters are
 * stateless singletons (per-call state lives in the registry/health state).
 *
 * IMPORTANT: nothing outside infrastructure/ai/adapters may import this
 * module directly — route through AiOrchestratorService (boundary rule
 * `repo-boundaries/no-ai-adapter-outside-ai-infra`).
 */
export function createAdapter(type: AiProviderType): IAiProviderAdapter {
  switch (type) {
    case 'openai':
      return new OpenAIAdapter();
    case 'groq':
      return new GroqAdapter();
    case 'gemini':
      return new GeminiAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'azure_openai':
      return new AzureOpenAIAdapter();
    case 'custom':
      return new CustomEndpointAdapter();
    case 'mock':
      return new MockAdapter();
    default:
      throw new Error(`Unknown AI provider type: ${String(type)}`);
  }
}

export type { IAiProviderAdapter };
