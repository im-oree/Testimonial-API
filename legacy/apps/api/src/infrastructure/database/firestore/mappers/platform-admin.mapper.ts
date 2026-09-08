import type { PlatformAdmin } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'userId', kind: 'string' },
  { key: 'role', kind: 'string' },
  { key: 'permissions', kind: 'stringArray' },
  { key: 'status', kind: 'string' },
  { key: 'twoFactorEnabled', kind: 'boolean' },
  { key: 'lastLoginAt', kind: 'dateOrNull' },
  { key: 'invitedBy', kind: 'stringOrNull' },
  { key: 'createdAt', kind: 'date' },
];

export const PlatformAdminFirestoreMapper = createFirestoreMapper<PlatformAdmin>(FIELDS);
