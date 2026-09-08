import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedError } from '@testimonial-api/domain';
import type { AuthContext } from '../auth-context';

/**
 * SessionGuard — requires an authenticated human session (kind='user').
 * The full engine (Firebase ID token → session cookie, README §7) is Doc 2;
 * this guard enforces the CONTRACT: a guard upstream must have populated
 * request.authContext with kind='user'.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ authContext?: AuthContext }>();
    const auth = request.authContext;
    if (!auth || auth.kind !== 'user') {
      throw new UnauthorizedError('A valid user session is required');
    }
    return true;
  }
}
