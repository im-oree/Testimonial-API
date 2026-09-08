import type { ApiKeyEnvironment } from '../entities/api-key.entity';
import { DomainError } from '../errors/domain.error';

/**
 * API-key pair value object. A "key" is a single opaque token on the wire:
 *
 *   pk_live_7c1e9b4a2f0d...   public  — browser-safe, origin-restricted, read-only
 *   sk_test_7c1e9b4a2f0d...   secret  — server-only, full CRUD, never origin-restricted
 *
 * Hashing (argon2id for secrets) is deliberately NOT here — it lives in the
 * auth module's key-issuance service (Doc 2). This VO only parses and shapes.
 */
export interface ParsedApiKey {
  type: 'public' | 'secret';
  environment: ApiKeyEnvironment;
  /** Everything after the prefix; adapter looks the row up by hash/plain value. */
  secret: string;
  /** The full raw token as it appears on the wire. */
  raw: string;
  /** First 12 chars of the raw token — UI identification (README §8). */
  prefix: string;
}

export class ApiKeyPair {
  private constructor(
    readonly publicKey: string,
    readonly secretKey: string,
    readonly environment: ApiKeyEnvironment,
  ) {}

  static generate(environment: ApiKeyEnvironment, publicKey: string, secretKey: string): ApiKeyPair {
    ApiKeyPair.validateToken('public', environment, publicKey);
    ApiKeyPair.validateToken('secret', environment, secretKey);
    return new ApiKeyPair(publicKey, secretKey, environment);
  }

  private static validateToken(type: 'public' | 'secret', environment: ApiKeyEnvironment, token: string): void {
    const expectedPrefix = type === 'public' ? 'pk' : 'sk';
    if (!token.startsWith(`${expectedPrefix}_${environment}_`)) {
      throw new DomainError(
        'VALIDATION_ERROR',
        `Invalid ${type} key for ${environment} environment — expected prefix "${expectedPrefix}_${environment}_"`,
      );
    }
  }

  /** Parses a raw token from an incoming request (X-Api-Key / Authorization header). */
  static parse(raw: string): ParsedApiKey {
    const match = /^(pk|sk)_(live|test)_([A-Za-z0-9_-]+)$/.exec(raw.trim());
    if (!match) {
      throw new DomainError('VALIDATION_ERROR', 'Malformed API key — expected pk_/sk_ + environment + value');
    }
    const [, kind, environment, secret] = match;
    return {
      type: kind === 'pk' ? 'public' : 'secret',
      environment: environment as ApiKeyEnvironment,
      secret,
      raw,
      prefix: raw.slice(0, 12),
    };
  }
}
