import type { AiRequestLog } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'taskConfigId', kind: 'string' },
  { key: 'providerId', kind: 'string' },
  { key: 'model', kind: 'string' },
  { key: 'prompt', kind: 'string' },
  { key: 'inputTokens', kind: 'number' },
  { key: 'outputTokens', kind: 'number' },
  { key: 'costUsd', kind: 'number' },
  { key: 'latencyMs', kind: 'number' },
  { key: 'rawResponse', kind: 'stringOrNull' },
  { key: 'parsedResponse', kind: 'recordOrNull' },
  { key: 'confidenceScore', kind: 'numberOrNull' },
  { key: 'status', kind: 'string' },
  { key: 'errorMessage', kind: 'stringOrNull' },
  { key: 'humanOverride', kind: 'boolean' },
  { key: 'humanOverrideValue', kind: 'stringOrNull' },
  { key: 'qualityRating', kind: 'numberOrNull' },
  { key: 'tenantId', kind: 'stringOrNull' },
  { key: 'appId', kind: 'stringOrNull' },
  { key: 'createdAt', kind: 'date' },
];

export const AiRequestLogFirestoreMapper = createFirestoreMapper<AiRequestLog>(FIELDS);
