import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { App } from '@testimonial-api/domain';
import type { AuthContext } from '../auth-context';

/** Extracts the authenticated App (API-key requests) from the request context. */
export const CurrentApp = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ authContext?: AuthContext }>();
  const key = request.authContext?.apiKey;
  return key ? ({ id: key.appId } as Pick<App, 'id'>) : undefined;
});
