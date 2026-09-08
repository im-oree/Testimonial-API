import type { AppStats } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'totalTestimonials', kind: 'number' },
  { key: 'approvedCount', kind: 'number' },
  { key: 'pendingCount', kind: 'number' },
  { key: 'avgRating', kind: 'number' },
  { key: 'bySource', kind: 'record' },
  { key: 'byMonth', kind: 'record' },
  { key: 'updatedAt', kind: 'date' },
];

// Doc id = appId (PK-shaped).
export const AppStatsFirestoreMapper = createFirestoreMapper<Omit<AppStats, 'appId'> & { appId: string }>(FIELDS);
