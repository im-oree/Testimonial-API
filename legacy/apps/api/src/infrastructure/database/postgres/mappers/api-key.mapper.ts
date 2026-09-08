import type { ApiKey } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'type', column: 'type', kind: 'string' },
  { domain: 'environment', column: 'environment', kind: 'string' },
  { domain: 'keyPrefix', column: 'key_prefix', kind: 'string' },
  { domain: 'keyHash', column: 'key_hash', kind: 'stringOrNull' },
  { domain: 'plainValue', column: 'plain_value', kind: 'stringOrNull' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'version', column: 'version', kind: 'number' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'revokedAt', column: 'revoked_at', kind: 'dateOrNull' },
  { domain: 'lastUsedAt', column: 'last_used_at', kind: 'dateOrNull' },
];

export const ApiKeyPgMappers = createPgMappers<ApiKey>(SPECS);
