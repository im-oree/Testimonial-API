import type { Template } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'type', column: 'type', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'description', column: 'description', kind: 'stringOrNull' },
  { domain: 'previewImageUrl', column: 'preview_image_url', kind: 'stringOrNull' },
  { domain: 'isPremium', column: 'is_premium', kind: 'boolean' },
  { domain: 'version', column: 'version', kind: 'number' },
  { domain: 'configSchema', column: 'config_schema', kind: 'jsonArray' },
  { domain: 'componentRef', column: 'component_ref', kind: 'string' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const TemplatePgMappers = createPgMappers<Template>(SPECS);
