export type AiProviderType =
  | 'openai'
  | 'groq'
  | 'gemini'
  | 'anthropic'
  | 'azure_openai'
  | 'custom'
  | 'mock';

export type AiProviderStatus = 'active' | 'disabled' | 'rate_limited' | 'error';

/**
 * AiProvider — a configured LLM provider (one row per credential+model
 * combination). API keys are ALWAYS stored KMS-encrypted (apiKeyEncrypted),
 * never plaintext at rest. Routing (lower priority = preferred) and circuit
 * breaking (consecutiveFailures) are driven off this row.
 */
export interface AiProvider {
  id: string;
  /** Human label, e.g. "Groq Production". */
  name: string;
  type: AiProviderType;
  status: AiProviderStatus;
  /** KMS-encrypted API key blob; 'mock:' prefix = no key needed (mock/canned). */
  apiKeyEncrypted: string;
  /** Custom / Azure / self-hosted endpoints. */
  baseUrl: string | null;
  /** e.g. "llama-3.1-70b-versatile". */
  defaultModel: string;
  maxTokensPerRequest: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  /** USD per 1k input tokens, e.g. 0.00000059 (per-token units as documented). */
  costPerInputToken: number;
  costPerOutputToken: number;
  /** Lower = higher priority in failover/weighted routing. */
  priority: number;
  /** true = used only when every primary provider has failed. */
  isFallback: boolean;
  /** Provider-specific defaults: temperature, top_p, etc. */
  settings: Record<string, unknown>;
  lastErrorAt: Date | null;
  lastError: string | null;
  /** Circuit breaker: > 3 skips this provider in failover until a health check resets it. */
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateAiProvider = Omit<
  AiProvider,
  'id' | 'createdAt' | 'updatedAt' | 'lastErrorAt' | 'lastError' | 'consecutiveFailures'
>;
