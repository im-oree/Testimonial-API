import type { AiTaskConfig } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'taskType', column: 'task_type', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'promptTemplate', column: 'prompt_template', kind: 'string' },
  { domain: 'responseSchema', column: 'response_schema', kind: 'jsonRecordOrNull' },
  { domain: 'routingStrategy', column: 'routing_strategy', kind: 'string' },
  { domain: 'providerIds', column: 'provider_ids', kind: 'stringArray' },
  { domain: 'providerWeights', column: 'provider_weights', kind: 'jsonRecord' },
  { domain: 'confidenceThreshold', column: 'confidence_threshold', kind: 'decimal' },
  { domain: 'autoApproveThreshold', column: 'auto_approve_threshold', kind: 'decimalOrNull' },
  { domain: 'maxRetries', column: 'max_retries', kind: 'number' },
  { domain: 'timeoutMs', column: 'timeout_ms', kind: 'number' },
  { domain: 'cacheTtlSeconds', column: 'cache_ttl_seconds', kind: 'number' },
  { domain: 'isActive', column: 'is_active', kind: 'boolean' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const AiTaskConfigPgMappers = createPgMappers<AiTaskConfig>(SPECS);
