import type { App } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'publicId', column: 'public_id', kind: 'string' },
  { domain: 'tenantId', column: 'tenant_id', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'description', column: 'description', kind: 'stringOrNull' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'quotaTestimonialsPerMonth', column: 'quota_testimonials_per_month', kind: 'number' },
  { domain: 'quotaWidgetsMax', column: 'quota_widgets_max', kind: 'number' },
  { domain: 'quotaFormsMax', column: 'quota_forms_max', kind: 'number' },
  { domain: 'quotaSeatMax', column: 'quota_seat_max', kind: 'number' },
  { domain: 'allowedOrigins', column: 'allowed_origins', kind: 'stringArray' },
  { domain: 'ipAllowList', column: 'ip_allow_list', kind: 'stringArrayOrNull' },
  { domain: 'requireCaptchaOnForms', column: 'require_captcha_on_forms', kind: 'boolean' },
  { domain: 'archivedAt', column: 'archived_at', kind: 'dateOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

export const AppPgMappers = createPgMappers<App>(SPECS);
