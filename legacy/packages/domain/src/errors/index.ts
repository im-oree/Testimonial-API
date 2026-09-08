// Errors barrel: base catalogue + feature helpers.

export * from './domain.error';
export * from './origin-not-allowed.error';
export * from './quota-exceeded.error';
export * from './ai.errors';

import { DomainError } from './domain.error';

/** Feature/plan/seat-limit helper errors built on the standard catalogue. */
export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} "${id}" was not found`, { resource, id });
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, details);
  }
}

/** Duplicate resource (Doc 3 §E: same fingerprint → 409 DUPLICATE + existingId). */
export class DuplicateError extends DomainError {
  constructor(message: string, existingId: string, details?: unknown) {
    super('DUPLICATE', message, { existingId, ...(details ?? {}) });
  }
}

/** Disallowed state-machine transition (Doc 3 §E: 422 INVALID_TRANSITION). */
export class InvalidTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string, note?: string) {
    super('INVALID_TRANSITION', `Cannot transition ${entity} from "${from}" to "${to}"`, {
      entity,
      from,
      to,
      note: note ?? 'transition not allowed by the state machine',
    });
  }
}

/** Field-level validation failure (README §11 envelope details array). */
export class ValidationError extends DomainError {
  constructor(message: string, details?: Array<{ field: string; reason: string } | Record<string, unknown>>) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class FileTooLargeError extends DomainError {
  constructor(maxBytes: number) {
    super('FILE_TOO_LARGE', `File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB upload limit`, { maxBytes });
  }
}

export class FileTypeNotAllowedError extends DomainError {
  constructor(mime: string, allowed: string[]) {
    super('FILE_TYPE_NOT_ALLOWED', `File type "${mime}" is not allowed`, { mime, allowed });
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message);
  }
}

export class TenantSuspendedError extends DomainError {
  constructor(tenantId: string) {
    super('TENANT_SUSPENDED', `Tenant "${tenantId}" is suspended. All app keys are disabled.`, { tenantId });
  }
}

export class KeyRevokedError extends DomainError {
  constructor() {
    super('KEY_REVOKED', 'This API key has been revoked or expired.');
  }
}

export class PlanFeatureLockedError extends DomainError {
  constructor(feature: string) {
    super('PLAN_FEATURE_LOCKED', `Your current plan does not include "${feature}".`, { feature });
  }
}
