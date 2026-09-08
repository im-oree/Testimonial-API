export type TenantStatus = 'active' | 'suspended' | 'pending_setup';
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  plan: PlanTier;
  status: TenantStatus;
  ownerEmail: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
  /** Soft-delete marker (SQL: deleted_at). List/find queries exclude deleted tenants. */
  deletedAt: Date | null;
  /** Denormalized usage counters — written by services/worker for fast dashboard reads. */
  testimonialsThisMonth: number;
  appsCount: number;
  staffCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTenant = Omit<
  Tenant,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'testimonialsThisMonth' | 'appsCount' | 'staffCount'
>;
