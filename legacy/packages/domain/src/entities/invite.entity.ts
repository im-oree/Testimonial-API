export type InviteScope = 'platform' | 'tenant';

export interface Invite {
  /** Random 32-byte url-safe token — also the lookup key (Firestore doc id / SQL PK). */
  token: string;
  email: string;
  scope: InviteScope;
  tenantId: string | null;
  /** Role being granted: platform_role when scope=platform, tenant_role when scope=tenant. */
  role: string;
  /** Default now + 72h (README §26). */
  expiresAt: Date;
  usedAt: Date | null;
  revoked: boolean;
  invitedBy: string;
  createdAt: Date;
}

export type CreateInvite = Omit<Invite, 'usedAt' | 'revoked' | 'createdAt'>;
