import type { AiTaskConfig } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'taskType', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'promptTemplate', kind: 'string' },
  { key: 'responseSchema', kind: 'recordOrNull' },
  { key: 'routingStrategy', kind: 'string' },
  { key: 'providerIds', kind: 'stringArray' },
  { key: 'providerWeights', kind: 'recordNumber' },
  { key: 'confidenceThreshold', kind: 'number' },
  { key: 'autoApproveThreshold', kind: 'numberOrNull' },
  { key: 'maxRetries', kind: 'number' },
  { key: 'timeoutMs', kind: 'number' },
  { key: 'cacheTtlSeconds', kind: 'number' },
  { key: 'isActive', kind: 'boolean' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const AiTaskConfigFirestoreMapper = createFirestoreMapper<AiTaskConfig>(FIELDS);
