import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError, PermissionSet } from '@testimonial-api/domain';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthContext } from '../auth-context';

/**
 * PermissionsGuard — enforcement unit of the RBAC system (README §10.6).
 * Reads the required permissions from @Permissions() metadata and checks the
 * request-scoped effective PermissionSet (recomputed fresh per request).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ authContext?: AuthContext }>();
    const perms = request.authContext?.permissions ?? PermissionSet.empty();
    if (!perms.hasAll(required)) {
      throw new ForbiddenError(`Missing permission(s): ${required.join(', ')}`);
    }
    return true;
  }
}
