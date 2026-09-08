import { DomainError } from './domain.error';

/** Thrown when a public-key request's Origin header isn't in the app's allowedOrigins. */
export class OriginNotAllowedError extends DomainError {
  constructor(origin: string, allowedOrigins: string[]) {
    super(
      'ORIGIN_NOT_ALLOWED',
      `Origin "${origin}" is not allowed for this app. Configure it under App → Security → Allowed Origins.`,
      { origin, allowedOrigins },
    );
  }
}
