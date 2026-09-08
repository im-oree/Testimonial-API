import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ApiKeyPair, UnauthorizedError } from '@testimonial-api/domain';
import type { AuthContext } from '../auth-context';

/**
 * ApiKeyGuard — authenticates machine consumers via X-Api-Key.
 * README §8.3 pipeline (hash lookup → Redis cache → origin check for pk →
 * rate limit → quota) is implemented by ApiKeyService/AuthService in Doc 2;
 * today this guard validates token format and defers the full verification
 * to Doc 2's AuthEngine.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      authContext?: AuthContext;
    }>();
    const raw = request.headers['x-api-key'] ?? request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!raw) throw new UnauthorizedError('Missing API key (X-Api-Key header)');
    try {
      ApiKeyPair.parse(raw);
    } catch {
      throw new UnauthorizedError('Malformed API key');
    }
    // Full key lookup + Redis cache + origin/IP checks: Doc 2 (AuthEngine).
    this.logger.debug('API key format valid — full verification pipeline ships with Doc 2.');
    return true;
  }
}
