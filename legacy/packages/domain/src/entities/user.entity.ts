// ============================================================
// TESTIMONIAL API — Domain Entities
// Pure, storage-agnostic TypeScript: ZERO decorators, ZERO
// Firestore types, ZERO Prisma types. This is what makes the
// Firestore ↔ PostgreSQL swap a one-line config change.
// Docs: docs/01-skeleton.md §3
// ============================================================

export type AuthProvider = 'password' | 'google' | 'magic_link';

export interface User {
  id: string;
  email: string;
  /** null if SSO-only */
  passwordHash: string | null;
  name: string;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Omit-on-create shape. Every entity exposes one for repository.create(). */
export type CreateUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
