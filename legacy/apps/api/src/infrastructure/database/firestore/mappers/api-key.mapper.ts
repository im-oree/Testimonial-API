import type { ApiKey } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'type', kind: 'string' },
  { key: 'environment', kind: 'string' },
  { key: 'keyPrefix', kind: 'string' },
  { key: 'keyHash', kind: 'stringOrNull' },
  { key: 'plainValue', kind: 'stringOrNull' },
  { key: 'status', kind: 'string' },
  { key: 'version', kind: 'number' },
  { key: 'createdAt', kind: 'date' },
  { key: 'revokedAt', kind: 'dateOrNull' },
  { key: 'lastUsedAt', kind: 'dateOrNull' },
];

export const ApiKeyFirestoreMapper = createFirestoreMapper<ApiKey>(FIELDS);
