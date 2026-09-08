import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '@testimonial-api/domain';
import type { ApiErrorBody } from '@testimonial-api/shared-types';
import { redactConnectionString } from '../utils/secret-redaction.util';

/**
 * Global exception filter. Maps every error to the documented envelope:
 *   { "error": { "code", "message", "details" } }  (README §11)
 * DomainError carries its own code + HTTP status (README §11.6).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<{ method: string; url: string; id?: string }>();

    if (exception instanceof DomainError) {
      const body: ApiErrorBody = {
        error: { code: exception.code, message: exception.message, details: exception.details },
      };
      res.status(exception.httpStatus).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : (payload as { message?: string | string[] }).message
            ? String((payload as { message: string | string[] }).message)
            : exception.message;
      const body: ApiErrorBody = {
        error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message },
      };
      res.status(status).json(body);
      return;
    }

    // Doc 6 §1.5: redact any connection-string credentials that a driver
    // diagnostic may embed before the stack hits the server log.
    const detail = exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
    this.logger.error(`Unhandled error on ${request.method} ${request.url}: ${redactConnectionString(detail)}`);
    // The client-facing body stays generic — a DB driver error must never
    // leak SQL text (Doc 6 §1.7 / checklist A8).
    const body: ApiErrorBody = {
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again later.' },
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
