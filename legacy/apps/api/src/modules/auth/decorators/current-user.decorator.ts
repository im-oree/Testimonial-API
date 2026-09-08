import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../auth-context';

/** Extracts the authenticated user id (or whole context) from the request. */
export const CurrentUser = createParamDecorator((data: keyof AuthContext | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ authContext?: AuthContext }>();
  const auth = request.authContext;
  if (!auth) return undefined;
  return data ? auth[data] : auth;
});
