// ============================================================
// RBAC permission catalogue — README §10.2–10.5.
//
// Roles are presets; PERMISSIONS are the enforcement unit
// (README §10.1). Effective set = roleDefaults ∪ explicitGrants
// − explicitRevokes, computed by the RBAC engine (Doc 2).
//
// These constants are the single source shared by:
//   • apps/api      — @Permissions() decorators + PermissionsGuard
//   • all frontends — menu visibility (README §10.7)
//   • packages/ui   — role editors with live checkboxes
// ============================================================

// ---------------------------------------------------------------------------
// Platform-level catalogue (Zojatech staff)
// ---------------------------------------------------------------------------
export const PLATFORM_PERMISSIONS = [
  'platform.tenants.view', // list/detail/analytics (endpoint reference "tenants.view")
  'platform.tenants.create',
  'platform.tenants.manage', // plan/status/branding overrides
  'platform.tenants.suspend',
  'platform.tenants.delete',
  'platform.tenants.impersonate', // support access into a tenant, fully audited
  'platform.staff.invite',
  'platform.staff.manage',
  'platform.templates.manage',
  'platform.plans.manage',
  'platform.flags.manage',
  'platform.security.manage', // IP rules, global rate limits
  'platform.audit.view',
  'platform.billing.view',
  'platform.billing.manage',
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

/** Effective permissions per platform role — v1 defaults (owner = everything). */
export const PLATFORM_ROLE_DEFAULTS: Record<string, readonly string[]> = {
  owner: PLATFORM_PERMISSIONS,
  admin: PLATFORM_PERMISSIONS.filter(
    (p) => p !== 'platform.billing.manage' && p !== 'platform.plans.manage',
  ),
  support: ['platform.tenants.view', 'platform.tenants.impersonate', 'platform.audit.view'],
  billing: ['platform.billing.view', 'platform.billing.manage'],
  developer: ['platform.templates.manage', 'platform.flags.manage', 'platform.security.manage'],
  read_only: ['platform.tenants.view', 'platform.audit.view', 'platform.billing.view'],
};

// ---------------------------------------------------------------------------
// Tenant-level catalogue (client company staff)
// ---------------------------------------------------------------------------
export const TENANT_PERMISSIONS = [
  'tenant.staff.invite',
  'tenant.staff.manage',
  'tenant.apps.create',
  'tenant.apps.manage', // edit settings, quotas view
  'tenant.apps.rotate_keys',
  'tenant.testimonials.read',
  'tenant.testimonials.write',
  'tenant.testimonials.approve',
  'tenant.testimonials.delete',
  'tenant.forms.manage',
  'tenant.widgets.manage',
  'tenant.integrations.manage',
  'tenant.webhooks.manage',
  'tenant.branding.manage',
  'tenant.billing.view',
  'tenant.billing.manage',
] as const;

export type TenantPermission = (typeof TENANT_PERMISSIONS)[number];

/** Effective permissions per tenant role — v1 defaults. */
export const TENANT_ROLE_DEFAULTS: Record<string, readonly string[]> = {
  owner: TENANT_PERMISSIONS,
  // "all except billing.manage, staff.manage (remove-owner)" — Doc 2 finalizes the
  // remove-owner nuance (an admin CAN manage staff but never demote/remove the owner).
  admin: TENANT_PERMISSIONS.filter((p) => p !== 'tenant.billing.manage'),
  editor: TENANT_PERMISSIONS.filter(
    (p) =>
      p.startsWith('tenant.testimonials.') ||
      p === 'tenant.forms.manage' ||
      p === 'tenant.widgets.manage',
  ),
  contributor: ['tenant.testimonials.read', 'tenant.testimonials.write'],
  viewer: ['tenant.testimonials.read'],
};
