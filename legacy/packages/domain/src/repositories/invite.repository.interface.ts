import type { CreateInvite, Invite } from '../entities/invite.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IInviteRepository {
  findByToken(token: string): Promise<Invite | null>;
  findByEmail(email: string, pagination: PaginationParams): Promise<PaginatedResult<Invite>>;
  findValidByEmail(email: string, scope: 'platform' | 'tenant', tenantId: string | null): Promise<Invite | null>;
  create(data: CreateInvite): Promise<Invite>;
  markUsed(token: string): Promise<void>;
  revoke(token: string): Promise<void>;
}
