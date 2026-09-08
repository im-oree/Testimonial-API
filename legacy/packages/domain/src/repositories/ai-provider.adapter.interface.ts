import type { AiProviderType } from '../entities/ai-provider.entity';

// ============================================================
// AI provider adapter PORT. Every concrete provider adapter
// (OpenAI, Groq, Gemini, Anthropic, Azure, custom endpoint, mock)
// implements this interface. Business logic NEVER talks to an
// adapter directly — it calls AiOrchestratorService.executeTask,
// which selects an adapter via the registry + routing (enforced by
// the repo-boundaries ESLint rule no-ai-adapter-outside-ai).
// ============================================================

export interface AiCompletionRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  temperature: number;
  /** Per-call deadline (ms) — wired from ai_task_configs.timeout_ms. */
  timeoutMs?: number;
  responseFormat?: 'text' | 'json';
  responseSchema?: Record<string, unknown>;
}

export interface AiCompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  latencyMs: number;
}

export interface IAiProviderAdapter {
  readonly providerType: AiProviderType;
  complete(request: AiCompletionRequest, apiKey: string, baseUrl?: string): Promise<AiCompletionResponse>;
  /** Cheap liveness probe; used by the 2-minute health-check job. */
  isHealthy(apiKey: string, baseUrl?: string): Promise<boolean>;
}
