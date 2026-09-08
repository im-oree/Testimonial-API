import type { Plan } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'tier', column: 'tier', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'priceCents', column: 'price_cents', kind: 'number' },
  { domain: 'maxApps', column: 'max_apps', kind: 'number' },
  { domain: 'maxTestimonialsPerMonth', column: 'max_testimonials_per_month', kind: 'number' },
  { domain: 'maxSeats', column: 'max_seats', kind: 'number' },
  { domain: 'features', column: 'features', kind: 'jsonRecord' },
  { domain: 'rateLimitPerMin', column: 'rate_limit_per_min', kind: 'number' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const PlanPgMappers = createPgMappers<Plan>(SPECS);
