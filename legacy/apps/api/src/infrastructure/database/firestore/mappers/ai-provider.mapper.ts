import type { AiProvider } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'name', kind: 'string' },
  { key: 'type', kind: 'string' },
  { key: 'status', kind: 'string' },
  { key: 'apiKeyEncrypted', kind: 'string' },
  { key: 'baseUrl', kind: 'stringOrNull' },
  { key: 'defaultModel', kind: 'string' },
  { key: 'maxTokensPerRequest', kind: 'number' },
  { key: 'rateLimitPerMinute', kind: 'number' },
  { key: 'rateLimitPerDay', kind: 'number' },
  { key: 'costPerInputToken', kind: 'number' },
  { key: 'costPerOutputToken', kind: 'number' },
  { key: 'priority', kind: 'number' },
  { key: 'isFallback', kind: 'boolean' },
  { key: 'settings', kind: 'record' },
  { key: 'lastErrorAt', kind: 'dateOrNull' },
  { key: 'lastError', kind: 'stringOrNull' },
  { key: 'consecutiveFailures', kind: 'number' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const AiProviderFirestoreMapper = createFirestoreMapper<AiProvider>(FIELDS);
