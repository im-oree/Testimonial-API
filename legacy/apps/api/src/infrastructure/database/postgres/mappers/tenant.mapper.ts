import type { Tenant } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'slug', column: 'slug', kind: 'string' },
  { domain: 'logoUrl', column: 'logo_url', kind: 'stringOrNull' },
  { domain: 'brandColor', column: 'brand_color', kind: 'string' },
  { domain: 'customDomain', column: 'custom_domain', kind: 'stringOrNull' },
  { domain: 'customDomainVerified', column: 'custom_domain_verified', kind: 'boolean' },
  { domain: 'plan', column: 'plan', kind: 'string' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'ownerEmail', column: 'owner_email', kind: 'string' },
  { domain: 'stripeCustomerId', column: 'stripe_customer_id', kind: 'stringOrNull' },
  { domain: 'currentPeriodEnd', column: 'current_period_end', kind: 'dateOrNull' },
  { domain: 'testimonialsThisMonth', column: 'testimonials_this_month', kind: 'number' },
  { domain: 'appsCount', column: 'apps_count', kind: 'number' },
  { domain: 'staffCount', column: 'staff_count', kind: 'number' },
  { domain: 'deletedAt', column: 'deleted_at', kind: 'dateOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const TenantPgMappers = createPgMappers<Tenant>(SPECS);
