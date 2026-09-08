import type { PermissionSet } from '@testimonial-api/domain';

/**
 * Request-scoped auth context — attached to every request by a guard and
 * consumed by controllers/services via @CurrentUser()/@CurrentApp() decorators.
 * README §7.2 step 5 describes how sessions are built; the RBAC engine (Doc 2)
 * computes `permissions` fresh on every request (permVersion staleness check).
 */
export interface AuthContext {
  kind: 'user' | 'apiKey' | 'system';
  /** users.id when kind=user */
  userId?: string;
  scope: 'platform' | 'tenant' | 'none';
  tenantId?: string | null;
  /** tenant_staff.id or platform_admins.id */
  principalId?: string | null;
  permissions: PermissionSet;
  /** Impersonation watermark (README §27) — every action is audit-tagged. */
  impersonating?: boolean;
  apiKey?: {
    keyId: string;
    appId: string;
    environment: 'live' | 'test';
    keyType: 'public' | 'secret';
  };
}
