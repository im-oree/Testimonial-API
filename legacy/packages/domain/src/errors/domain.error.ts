// ============================================================
// Base domain error. Codes follow README §11.6 "Standard error
// codes" so the HTTP filter (apps/api/src/common) can map them
// 1:1 without business logic knowing anything about HTTP.
// ============================================================

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'KEY_REVOKED'
  | 'PLAN_FEATURE_LOCKED'
  | 'TENANT_SUSPENDED'
  | 'CONFLICT'
  | 'DUPLICATE'
  | 'INVALID_TRANSITION'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'INTERNAL';

/** README §11.6 — default HTTP mapping per code. */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 403,
  ORIGIN_NOT_ALLOWED: 403,
  KEY_REVOKED: 401,
  PLAN_FEATURE_LOCKED: 402,
  TENANT_SUSPENDED: 423,
  CONFLICT: 409,
  DUPLICATE: 409,
  INVALID_TRANSITION: 422,
  FILE_TOO_LARGE: 413,
  FILE_TYPE_NOT_ALLOWED: 415,
  // Reserved for the catch-all HTTP filter — not a business-code README lists.
  INTERNAL: 500,
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.details = details;
  }
}
