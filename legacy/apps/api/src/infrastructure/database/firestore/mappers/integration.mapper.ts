import type { Integration } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'provider', kind: 'string' },
  { key: 'credentialsEncrypted', kind: 'stringOrNull' },
  { key: 'config', kind: 'record' },
  { key: 'status', kind: 'string' },
  { key: 'lastSyncAt', kind: 'dateOrNull' },
  { key: 'lastError', kind: 'stringOrNull' },
  { key: 'createdAt', kind: 'date' },
];

export const IntegrationFirestoreMapper = createFirestoreMapper<Integration>(FIELDS);
