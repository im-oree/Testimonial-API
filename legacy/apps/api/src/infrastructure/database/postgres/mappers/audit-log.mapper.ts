import type { AuditLog } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

// BIGSERIAL id arrives as BigInt; domain carries string.
const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'actorId', column: 'actor_id', kind: 'stringOrNull' },
  { domain: 'actorType', column: 'actor_type', kind: 'string' },
  { domain: 'actorLabel', column: 'actor_label', kind: 'stringOrNull' },
  { domain: 'action', column: 'action', kind: 'string' },
  { domain: 'targetType', column: 'target_type', kind: 'stringOrNull' },
  { domain: 'targetId', column: 'target_id', kind: 'stringOrNull' },
  { domain: 'tenantId', column: 'tenant_id', kind: 'stringOrNull' },
  { domain: 'ip', column: 'ip', kind: 'stringOrNull' },
  { domain: 'userAgent', column: 'user_agent', kind: 'stringOrNull' },
  { domain: 'metadata', column: 'metadata', kind: 'jsonRecord' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const AuditLogPgMappers = createPgMappers<AuditLog>(SPECS);
