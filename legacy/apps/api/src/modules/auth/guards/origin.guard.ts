import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OriginNotAllowedError } from '@testimonial-api/domain';
import type { AuthContext } from '../auth-context';

/**
 * OriginGuard — public-key requests must come from an allowed Origin
 * (README §8.3 step 5). Secret-key requests skip the check (never
 * origin-restricted). AllowedOrigins are runtime-editable (apps module).
 */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      authContext?: AuthContext;
    }>();
    const auth = request.authContext;
    if (!auth?.apiKey) return true; // user sessions unaffected
    if (auth.apiKey.keyType === 'secret') return true; // never origin-restricted
    const origin = request.headers.origin ?? request.headers.referer;
    if (!origin) {
      throw new OriginNotAllowedError('(no Origin header)', []);
    }
    const host = new URL(origin).host;
    const allowed = this.allowedOriginsFor(auth);
    if (!allowed.some((a) => originMatches(a, host, origin))) {
      throw new OriginNotAllowedError(origin, allowed);
    }
    return true;
  }

  // Doc 2's AuthEngine loads real allowedOrigins from the app record; this
  // guard only implements the matching semantics (host/pattern + exact URL).
  private allowedOriginsFor(auth: AuthContext): string[] {
    return (auth as AuthContext & { app?: { allowedOrigins?: string[] } }).app?.allowedOrigins ?? [];
  }
}

function originMatches(pattern: string, requestHost: string, requestOrigin: string): boolean {
  if (pattern === requestOrigin) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".acme.io"
    return requestHost.endsWith(suffix) || requestHost === suffix.slice(1);
  }
  try {
    return new URL(pattern).host === requestHost;
  } catch {
    return false;
  }
}
