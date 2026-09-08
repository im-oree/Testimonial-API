import type { PlatformAdmin } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'userId', column: 'user_id', kind: 'string' },
  { domain: 'role', column: 'role', kind: 'string' },
  { domain: 'permissions', column: 'permissions', kind: 'stringArray' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'twoFactorEnabled', column: 'two_factor_enabled', kind: 'boolean' },
  { domain: 'lastLoginAt', column: 'last_login_at', kind: 'dateOrNull' },
  { domain: 'invitedBy', column: 'invited_by', kind: 'stringOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const PlatformAdminPgMappers = createPgMappers<PlatformAdmin>(SPECS);
