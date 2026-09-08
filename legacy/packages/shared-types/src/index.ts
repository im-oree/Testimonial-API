// @testimonial-api/shared-types — DTO/enums/zod/rbac shared FE+BE.

export * from './rbac/permission-catalog';
export * from './zod/schemas';
export * from './api/types';

// Convenient type re-exports from the domain so frontends depend on ONE
// package for all shared shapes (domain entities stay the source of truth).
export type {
  App,
  ApiKey,
  ApiKeyEnvironment,
  CollectionForm,
  FormQuestion,
  Integration,
  Invite,
  Plan,
  PlanTier,
  RatingType,
  Tenant,
  TenantRole,
  TenantStatus,
  Testimonial,
  TestimonialSource,
  TestimonialStatus,
  Template,
  User,
  WebhookEndpoint,
  WebhookDelivery,
  Widget,
} from '@testimonial-api/domain';
