import type { TenantStaff } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'tenantId', column: 'tenant_id', kind: 'string' },
  { domain: 'userId', column: 'user_id', kind: 'string' },
  { domain: 'role', column: 'role', kind: 'string' },
  { domain: 'permissions', column: 'permissions', kind: 'stringArray' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'invitedAt', column: 'invited_at', kind: 'date' },
  { domain: 'activatedAt', column: 'activated_at', kind: 'dateOrNull' },
  { domain: 'lastLoginAt', column: 'last_login_at', kind: 'dateOrNull' },
];

export const TenantStaffPgMappers = createPgMappers<TenantStaff>(SPECS);
