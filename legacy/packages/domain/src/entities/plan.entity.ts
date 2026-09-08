import type { PlanTier } from './tenant.entity';

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  priceCents: number;
  /** -1 = unlimited. */
  maxApps: number;
  maxTestimonialsPerMonth: number;
  maxSeats: number;
  /** Feature flags: { ai_import: true, custom_domain: true, remove_branding: false, ... }. */
  features: Record<string, boolean>;
  rateLimitPerMin: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePlan = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>;
