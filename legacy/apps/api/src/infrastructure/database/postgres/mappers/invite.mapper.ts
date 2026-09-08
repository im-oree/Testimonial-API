import type { Invite } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'token', column: 'token', kind: 'string' },
  { domain: 'email', column: 'email', kind: 'string' },
  { domain: 'scope', column: 'scope', kind: 'string' },
  { domain: 'tenantId', column: 'tenant_id', kind: 'stringOrNull' },
  { domain: 'role', column: 'role', kind: 'string' },
  { domain: 'expiresAt', column: 'expires_at', kind: 'date' },
  { domain: 'usedAt', column: 'used_at', kind: 'dateOrNull' },
  { domain: 'revoked', column: 'revoked', kind: 'boolean' },
  { domain: 'invitedBy', column: 'invited_by', kind: 'string' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const InvitePgMappers = createPgMappers<Invite>(SPECS);
