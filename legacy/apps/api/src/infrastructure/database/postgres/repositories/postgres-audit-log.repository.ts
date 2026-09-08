import { Injectable } from '@nestjs/common';
import type {
  AuditLog,
  AuditLogFilters,
  CreateAuditLog,
  IAuditLogRepository,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AuditLogPgMappers } from '../mappers/audit-log.mapper';

@Injectable()
export class PostgresAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): AuditLog {
    return AuditLogPgMappers.toDomain(row as Record<string, unknown>) as AuditLog;
  }

  async findById(id: string): Promise<AuditLog | null> {
    const row = await this.prisma.auditLog.findUnique({ where: { id: BigInt(id) } });
    return row ? this.toDomain(row) : null;
  }

  async findMany(filters: AuditLogFilters, pagination: PaginationParams): Promise<PaginatedResult<AuditLog>> {
    const where: Record<string, unknown> = {};
    if (filters.tenantId) where.tenant_id = filters.tenantId;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.actorType) where.actor_type = filters.actorType;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.target_type = filters.targetType;
    if (filters.targetId) where.target_id = filters.targetId;
    if (filters.createdAt?.from || filters.createdAt?.to) {
      where.created_at = {
        ...(filters.createdAt.from ? { gte: filters.createdAt.from } : {}),
        ...(filters.createdAt.to ? { lte: filters.createdAt.to } : {}),
      };
    }
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(200, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.auditLog.count({ where: where as never }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findManyByTarget(
    targetType: string,
    targetId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.findMany({ targetType, targetId }, pagination);
  }

  async create(data: CreateAuditLog): Promise<AuditLog> {
    const row = await this.prisma.auditLog.create({
      data: AuditLogPgMappers.toPersistence(data as Partial<AuditLog>) as never,
    });
    return this.toDomain(row);
  }
}
