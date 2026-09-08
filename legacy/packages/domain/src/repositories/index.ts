// ============================================================
// Repository ports — barrel. Re-export every *Interface token so
// apps (api + worker) can @Inject('ITestimonialRepository') etc.
// ============================================================

export type { IUserRepository } from './user.repository.interface';
export type { IPlatformAdminRepository } from './platform-admin.repository.interface';
export type { ITenantRepository } from './tenant.repository.interface';
export type { ITenantStaffRepository } from './tenant-staff.repository.interface';
export type { IAppRepository } from './app.repository.interface';
export type { IApiKeyRepository } from './api-key.repository.interface';
export type { ITestimonialRepository, TestimonialFilters, TestimonialStatsSummary } from './testimonial.repository.interface';
export type { ICollectionFormRepository } from './collection-form.repository.interface';
export type { IFormQuestionRepository } from './form-question.repository.interface';
export type { IWidgetRepository } from './widget.repository.interface';
export type { ITemplateRepository } from './template.repository.interface';
export type { IIntegrationRepository } from './integration.repository.interface';
export type { IWebhookEndpointRepository } from './webhook-endpoint.repository.interface';
export type { IWebhookDeliveryRepository } from './webhook-delivery.repository.interface';
export type { IInviteRepository } from './invite.repository.interface';
export type { IAuditLogRepository, AuditLogFilters } from './audit-log.repository.interface';
export type { IPlanRepository } from './plan.repository.interface';
export type { IAiProviderRepository } from './ai-provider.repository.interface';
export type { IAiTaskConfigRepository } from './ai-task-config.repository.interface';
export type { IAiRequestLogRepository } from './ai-request-log.repository.interface';
export type { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from './ai-provider.adapter.interface';
export type { IKmsDecryptor } from './kms.port';
export type { IAppStatsRepository } from './app-stats.repository.interface';
export type { PaginatedResult, PaginationParams, TimeRangeFilter, DEFAULT_PAGINATION } from './common.types';

/** Injection tokens — single source of truth for @Inject() strings across api + worker. */
export const REPOSITORY_TOKENS = {
  USER: 'IUserRepository',
  PLATFORM_ADMIN: 'IPlatformAdminRepository',
  TENANT: 'ITenantRepository',
  TENANT_STAFF: 'ITenantStaffRepository',
  APP: 'IAppRepository',
  API_KEY: 'IApiKeyRepository',
  TESTIMONIAL: 'ITestimonialRepository',
  COLLECTION_FORM: 'ICollectionFormRepository',
  FORM_QUESTION: 'IFormQuestionRepository',
  WIDGET: 'IWidgetRepository',
  TEMPLATE: 'ITemplateRepository',
  INTEGRATION: 'IIntegrationRepository',
  WEBHOOK_ENDPOINT: 'IWebhookEndpointRepository',
  WEBHOOK_DELIVERY: 'IWebhookDeliveryRepository',
  INVITE: 'IInviteRepository',
  AUDIT_LOG: 'IAuditLogRepository',
  PLAN: 'IPlanRepository',
  APP_STATS: 'IAppStatsRepository',
  AI_PROVIDER: 'IAiProviderRepository',
  AI_TASK_CONFIG: 'IAiTaskConfigRepository',
  AI_REQUEST_LOG: 'IAiRequestLogRepository',
  KMS: 'IKmsDecryptor',
} as const;
