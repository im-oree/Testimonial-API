import type { TenantStaff } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'tenantId', kind: 'string' },
  { key: 'userId', kind: 'string' },
  { key: 'role', kind: 'string' },
  { key: 'permissions', kind: 'stringArray' },
  { key: 'status', kind: 'string' },
  { key: 'invitedAt', kind: 'date' },
  { key: 'activatedAt', kind: 'dateOrNull' },
  { key: 'lastLoginAt', kind: 'dateOrNull' },
];

export const TenantStaffFirestoreMapper = createFirestoreMapper<TenantStaff>(FIELDS);
