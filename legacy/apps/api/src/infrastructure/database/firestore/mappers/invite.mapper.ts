import type { Invite } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'token', kind: 'string' }, // mirrors doc id
  { key: 'email', kind: 'string' },
  { key: 'scope', kind: 'string' },
  { key: 'tenantId', kind: 'stringOrNull' },
  { key: 'role', kind: 'string' },
  { key: 'expiresAt', kind: 'date' },
  { key: 'usedAt', kind: 'dateOrNull' },
  { key: 'revoked', kind: 'boolean' },
  { key: 'invitedBy', kind: 'string' },
  { key: 'createdAt', kind: 'date' },
];

export const InviteFirestoreMapper = createFirestoreMapper<Invite>(FIELDS);
