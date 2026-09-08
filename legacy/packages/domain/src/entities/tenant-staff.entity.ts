export type TenantRole = 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer';
export type StaffStatus = 'invited' | 'active' | 'disabled';

export interface TenantStaff {
  id: string;
  tenantId: string;
  /** Links to central users/identity table — a user may be staff on many tenants AND a platform admin. */
  userId: string;
  role: TenantRole;
  /** Explicit permission overrides on top of the role default set. */
  permissions: string[];
  status: StaffStatus;
  invitedAt: Date;
  activatedAt: Date | null;
  lastLoginAt: Date | null;
}

export type CreateTenantStaff = Omit<TenantStaff, 'id' | 'invitedAt' | 'activatedAt' | 'lastLoginAt'>;
