import type { AiProvider } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'type', column: 'type', kind: 'string' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'apiKeyEncrypted', column: 'api_key_encrypted', kind: 'string' },
  { domain: 'baseUrl', column: 'base_url', kind: 'stringOrNull' },
  { domain: 'defaultModel', column: 'default_model', kind: 'string' },
  { domain: 'maxTokensPerRequest', column: 'max_tokens_per_request', kind: 'number' },
  { domain: 'rateLimitPerMinute', column: 'rate_limit_per_minute', kind: 'number' },
  { domain: 'rateLimitPerDay', column: 'rate_limit_per_day', kind: 'number' },
  { domain: 'costPerInputToken', column: 'cost_per_input_token', kind: 'decimal' },
  { domain: 'costPerOutputToken', column: 'cost_per_output_token', kind: 'decimal' },
  { domain: 'priority', column: 'priority', kind: 'number' },
  { domain: 'isFallback', column: 'is_fallback', kind: 'boolean' },
  { domain: 'settings', column: 'settings', kind: 'jsonRecord' },
  { domain: 'lastErrorAt', column: 'last_error_at', kind: 'dateOrNull' },
  { domain: 'lastError', column: 'last_error', kind: 'stringOrNull' },
  { domain: 'consecutiveFailures', column: 'consecutive_failures', kind: 'number' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const AiProviderPgMappers = createPgMappers<AiProvider>(SPECS);
