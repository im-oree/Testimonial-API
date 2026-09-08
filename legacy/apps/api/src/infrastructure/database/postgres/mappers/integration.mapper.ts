import type { Integration } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'provider', column: 'provider', kind: 'string' },
  { domain: 'credentialsEncrypted', column: 'credentials_encrypted', kind: 'stringOrNull' },
  { domain: 'config', column: 'config', kind: 'jsonRecord' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'lastSyncAt', column: 'last_sync_at', kind: 'dateOrNull' },
  { domain: 'lastError', column: 'last_error', kind: 'stringOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const IntegrationPgMappers = createPgMappers<Integration>(SPECS);
