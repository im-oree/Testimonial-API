import type { Testimonial } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'environment', kind: 'string' },
  { key: 'authorName', kind: 'string' },
  { key: 'authorTitle', kind: 'stringOrNull' },
  { key: 'authorCompany', kind: 'stringOrNull' },
  { key: 'authorAvatarUrl', kind: 'stringOrNull' },
  { key: 'authorEmail', kind: 'stringOrNull' },
  { key: 'message', kind: 'string' },
  { key: 'rating', kind: 'numberOrNull' },
  { key: 'ratingType', kind: 'string' },
  { key: 'mediaUrls', kind: 'stringArray' },
  { key: 'videoUrl', kind: 'stringOrNull' },
  { key: 'source', kind: 'string' },
  { key: 'sourceRef', kind: 'stringOrNull' },
  { key: 'status', kind: 'string' },
  { key: 'reviewedBy', kind: 'stringOrNull' },
  { key: 'reviewedAt', kind: 'dateOrNull' },
  { key: 'rejectionReason', kind: 'stringOrNull' },
  { key: 'tags', kind: 'stringArray' },
  { key: 'featured', kind: 'boolean' },
  { key: 'sortOrder', kind: 'number' },
  { key: 'customFields', kind: 'stringMap' },
  { key: 'fingerprint', kind: 'string' },
  { key: 'language', kind: 'stringOrNull' },
  { key: 'consentGiven', kind: 'boolean' },
  { key: 'deletedAt', kind: 'dateOrNull' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const TestimonialFirestoreMapper = createFirestoreMapper<Testimonial>(FIELDS);
