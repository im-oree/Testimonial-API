import type { User } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'email', kind: 'string' },
  { key: 'passwordHash', kind: 'stringOrNull' },
  { key: 'name', kind: 'string' },
  { key: 'avatarUrl', kind: 'stringOrNull' },
  { key: 'authProvider', kind: 'string' },
  { key: 'mfaEnabled', kind: 'boolean' },
  { key: 'mfaSecretEncrypted', kind: 'stringOrNull' },
  { key: 'emailVerifiedAt', kind: 'dateOrNull' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const UserFirestoreMapper = createFirestoreMapper<User>(FIELDS);
