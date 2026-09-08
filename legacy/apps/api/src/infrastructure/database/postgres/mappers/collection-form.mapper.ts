import type { CollectionForm } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

// `questions` arrive via a separate form_questions query (join) in the repo.
const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'slug', column: 'slug', kind: 'string' },
  { domain: 'templateId', column: 'template_id', kind: 'string' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'ratingType', column: 'rating_type', kind: 'string' },
  { domain: 'collectVideo', column: 'collect_video', kind: 'boolean' },
  { domain: 'collectConsent', column: 'collect_consent', kind: 'boolean' },
  { domain: 'redirectUrlOnSuccess', column: 'redirect_url_on_success', kind: 'stringOrNull' },
  { domain: 'styleOverrides', column: 'style_overrides', kind: 'jsonStringMap' },
  { domain: 'submissionCount', column: 'submission_count', kind: 'number' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const CollectionFormPgMappers = createPgMappers<Omit<CollectionForm, 'questions'>>(SPECS);
