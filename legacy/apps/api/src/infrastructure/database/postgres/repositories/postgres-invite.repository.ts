import { Injectable } from '@nestjs/common';
import type { CreateInvite, Invite, IInviteRepository, PaginatedResult, PaginationParams } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { InvitePgMappers } from '../mappers/invite.mapper';

@Injectable()
export class PostgresInviteRepository implements IInviteRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Invite {
    return InvitePgMappers.toDomain(row as Record<string, unknown>) as Invite;
  }

  async findByToken(token: string): Promise<Invite | null> {
    const row = await this.prisma.invite.findUnique({ where: { token } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string, pagination: PaginationParams): Promise<PaginatedResult<Invite>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { email };
    const [rows, total] = await Promise.all([
      this.prisma.invite.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.invite.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findValidByEmail(
    email: string,
    scope: 'platform' | 'tenant',
    tenantId: string | null,
  ): Promise<Invite | null> {
    const now = new Date();
    const row = await this.prisma.invite.findFirst({
      where: {
        email,
        scope,
        tenant_id: tenantId,
        revoked: false,
        used_at: null,
        expires_at: { gt: now },
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateInvite): Promise<Invite> {
    const row = await this.prisma.invite.create({ data: InvitePgMappers.toPersistence(data as Partial<Invite>) as never });
    return this.toDomain(row);
  }

  async markUsed(token: string): Promise<void> {
    await this.prisma.invite.update({ where: { token }, data: { used_at: new Date() } });
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.invite.update({ where: { token }, data: { revoked: true } });
  }
}
