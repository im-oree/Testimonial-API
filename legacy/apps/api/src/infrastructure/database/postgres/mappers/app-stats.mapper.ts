import type { AppStats } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'totalTestimonials', column: 'total_testimonials', kind: 'number' },
  { domain: 'approvedCount', column: 'approved_count', kind: 'number' },
  { domain: 'pendingCount', column: 'pending_count', kind: 'number' },
  { domain: 'avgRating', column: 'avg_rating', kind: 'decimal' },
  { domain: 'bySource', column: 'by_source', kind: 'jsonRecord' },
  { domain: 'byMonth', column: 'by_month', kind: 'jsonRecord' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const AppStatsPgMappers = createPgMappers<AppStats>(SPECS);
