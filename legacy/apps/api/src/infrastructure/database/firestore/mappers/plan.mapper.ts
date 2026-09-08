import type { Plan } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'tier', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'priceCents', kind: 'number' },
  { key: 'maxApps', kind: 'number' },
  { key: 'maxTestimonialsPerMonth', kind: 'number' },
  { key: 'maxSeats', kind: 'number' },
  { key: 'features', kind: 'record' },
  { key: 'rateLimitPerMin', kind: 'number' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const PlanFirestoreMapper = createFirestoreMapper<Plan>(FIELDS);
