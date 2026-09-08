export type PlatformRole = 'owner' | 'admin' | 'support' | 'billing' | 'developer' | 'read_only';
export type PlatformStaffStatus = 'invited' | 'active' | 'disabled';

export interface PlatformAdmin {
  id: string;
  userId: string;
  role: PlatformRole;
  /** Explicit permission overrides, merged over role defaults at runtime (RBAC engine, Doc 2). */
  permissions: string[];
  status: PlatformStaffStatus;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  invitedBy: string | null;
  createdAt: Date;
}

export type CreatePlatformAdmin = Omit<PlatformAdmin, 'id' | 'createdAt'>;
