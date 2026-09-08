import { DomainError } from './domain.error';

/** Thrown when a write would exceed the app's monthly quota or a plan ceiling. */
export class QuotaExceededError extends DomainError {
  constructor(
    /** Which quota was hit: 'testimonials' | 'apps' | 'seats' | 'widgets' | 'forms'. */
    public readonly resource: string,
    public readonly limit: number,
    public readonly periodEnd?: Date | null,
  ) {
    super('QUOTA_EXCEEDED', `Monthly quota exceeded for "${resource}" (limit ${limit})`, {
      resource,
      limit,
      periodEnd,
    });
  }
}
