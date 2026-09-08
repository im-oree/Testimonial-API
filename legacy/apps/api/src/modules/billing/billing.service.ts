import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { IPlanRepository, ITenantRepository } from '@testimonial-api/domain';

/**
 * BillingService — Stripe-backed subscriptions + plan sync (README §25).
 * Stripe checkout/webhook handling arrives with the billing controller in
 * Doc 3; usage-meter rollover scheduling ships in Doc 2.
 */
@Injectable()
export class BillingService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT) private readonly tenants: ITenantRepository,
    @Inject(REPOSITORY_TOKENS.PLAN) private readonly plans: IPlanRepository,
  ) {
    void this.tenants;
    void this.plans;
  }
}
