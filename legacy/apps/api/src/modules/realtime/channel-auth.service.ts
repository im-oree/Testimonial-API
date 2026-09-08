import { Injectable } from '@nestjs/common';
import { PermissionSet } from '@testimonial-api/domain';
import type { AuthContext } from '../auth/auth-context';

/**
 * ChannelAuthService — Socket.IO channel authorization (README §13.2):
 * user:{uid} personal, tenant:{tenantId}, app:{appId}. Server validates on
 * every join against the CURRENT permission set. Gateway transport wiring
 * (Socket.IO namespaces) ships in Doc 3.
 */
@Injectable()
export class ChannelAuthService {
  canJoin(channel: string, auth: AuthContext): boolean {
    const perms: PermissionSet = auth.permissions;
    if (channel.startsWith('user:')) return auth.kind === 'user' && channel === `user:${auth.userId}`;
    if (channel.startsWith('tenant:')) {
      const tenantId = channel.split(':')[1];
      return auth.scope === 'tenant' && auth.tenantId === tenantId;
    }
    if (channel.startsWith('app:')) {
      // app channels are gated by any testimonial/widget permission; Doc 3
      // tightens to per-app membership.
      return perms.hasAny(['tenant.testimonials.read', 'tenant.widgets.manage', 'tenant.forms.manage']);
    }
    return false;
  }
}
