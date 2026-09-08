import type { Testimonial } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'environment', column: 'environment', kind: 'string' },
  { domain: 'authorName', column: 'author_name', kind: 'string' },
  { domain: 'authorTitle', column: 'author_title', kind: 'stringOrNull' },
  { domain: 'authorCompany', column: 'author_company', kind: 'stringOrNull' },
  { domain: 'authorAvatarUrl', column: 'author_avatar_url', kind: 'stringOrNull' },
  { domain: 'authorEmail', column: 'author_email', kind: 'stringOrNull' },
  { domain: 'message', column: 'message', kind: 'string' },
  { domain: 'rating', column: 'rating', kind: 'numberOrNull' },
  { domain: 'ratingType', column: 'rating_type', kind: 'string' },
  { domain: 'mediaUrls', column: 'media_urls', kind: 'stringArray' },
  { domain: 'videoUrl', column: 'video_url', kind: 'stringOrNull' },
  { domain: 'source', column: 'source', kind: 'string' },
  { domain: 'sourceRef', column: 'source_ref', kind: 'stringOrNull' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'reviewedBy', column: 'reviewed_by', kind: 'stringOrNull' },
  { domain: 'reviewedAt', column: 'reviewed_at', kind: 'dateOrNull' },
  { domain: 'rejectionReason', column: 'rejection_reason', kind: 'stringOrNull' },
  { domain: 'tags', column: 'tags', kind: 'stringArray' },
  { domain: 'featured', column: 'featured', kind: 'boolean' },
  { domain: 'sortOrder', column: 'sort_order', kind: 'number' },
  { domain: 'customFields', column: 'custom_fields', kind: 'jsonStringMap' },
  { domain: 'fingerprint', column: 'fingerprint', kind: 'string' },
  { domain: 'language', column: 'language', kind: 'stringOrNull' },
  { domain: 'consentGiven', column: 'consent_given', kind: 'boolean' },
  { domain: 'deletedAt', column: 'deleted_at', kind: 'dateOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const TestimonialPgMappers = createPgMappers<Testimonial>(SPECS);
