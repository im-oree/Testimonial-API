import type { AiRequestLog } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'taskConfigId', column: 'task_config_id', kind: 'string' },
  { domain: 'providerId', column: 'provider_id', kind: 'string' },
  { domain: 'model', column: 'model', kind: 'string' },
  { domain: 'prompt', column: 'prompt', kind: 'string' },
  { domain: 'inputTokens', column: 'input_tokens', kind: 'number' },
  { domain: 'outputTokens', column: 'output_tokens', kind: 'number' },
  { domain: 'costUsd', column: 'cost_usd', kind: 'decimal' },
  { domain: 'latencyMs', column: 'latency_ms', kind: 'number' },
  { domain: 'rawResponse', column: 'raw_response', kind: 'stringOrNull' },
  { domain: 'parsedResponse', column: 'parsed_response', kind: 'jsonRecordOrNull' },
  { domain: 'confidenceScore', column: 'confidence_score', kind: 'decimalOrNull' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'errorMessage', column: 'error_message', kind: 'stringOrNull' },
  { domain: 'humanOverride', column: 'human_override', kind: 'boolean' },
  { domain: 'humanOverrideValue', column: 'human_override_value', kind: 'stringOrNull' },
  { domain: 'qualityRating', column: 'quality_rating', kind: 'numberOrNull' },
  { domain: 'tenantId', column: 'tenant_id', kind: 'stringOrNull' },
  { domain: 'appId', column: 'app_id', kind: 'stringOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const AiRequestLogPgMappers = createPgMappers<AiRequestLog>(SPECS);
