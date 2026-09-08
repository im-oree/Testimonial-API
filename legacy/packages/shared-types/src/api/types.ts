// Shared HTTP/API envelope shapes (README §11 "All errors follow:").

import type { ErrorCode } from '@testimonial-api/domain';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/** Standard paginated response body (all list endpoints). */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
