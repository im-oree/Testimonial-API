import type { User } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'email', column: 'email', kind: 'string' },
  { domain: 'passwordHash', column: 'password_hash', kind: 'stringOrNull' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'avatarUrl', column: 'avatar_url', kind: 'stringOrNull' },
  { domain: 'authProvider', column: 'auth_provider', kind: 'string' },
  { domain: 'mfaEnabled', column: 'mfa_enabled', kind: 'boolean' },
  { domain: 'mfaSecretEncrypted', column: 'mfa_secret_encrypted', kind: 'stringOrNull' },
  { domain: 'emailVerifiedAt', column: 'email_verified_at', kind: 'dateOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const UserPgMappers = createPgMappers<User>(SPECS);
