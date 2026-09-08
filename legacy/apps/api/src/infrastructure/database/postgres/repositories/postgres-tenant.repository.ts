import { Injectable } from '@nestjs/common';
import type {
  CreateTenant,
  ITenantRepository,
  PaginatedResult,
  PaginationParams,
  Tenant,
  TenantStatus,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { TenantPgMappers } from '../mappers/tenant.mapper';

@Injectable()
export class PostgresTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Tenant {
    return TenantPgMappers.toDomain(row as Record<string, unknown>) as Tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findFirst({ where: { id, deleted_at: null } });
    return row ? this.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findFirst({ where: { slug, deleted_at: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByCustomDomain(domain: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findFirst({ where: { custom_domain: domain, deleted_at: null } });
    return row ? this.toDomain(row) : null;
  }

  async findMany(
    filters: { status?: TenantStatus; search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Tenant>> {
    const where = {
      deleted_at: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' as const } } : {}),
    };
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async create(data: CreateTenant): Promise<Tenant> {
    const row = await this.prisma.tenant.create({
      data: TenantPgMappers.toPersistence(data as Partial<Tenant>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const row = await this.prisma.tenant.update({
      where: { id },
      data: { ...TenantPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async incrementUsageCounter(
    id: string,
    field: 'testimonialsThisMonth' | 'appsCount' | 'staffCount',
    by: number,
  ): Promise<void> {
    const columnMap = {
      testimonialsThisMonth: 'testimonials_this_month',
      appsCount: 'apps_count',
      staffCount: 'staff_count',
    } as const;
    await this.prisma.tenant.update({
      where: { id },
      data: { [columnMap[field]]: { increment: by } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.tenant.update({ where: { id }, data: { deleted_at: new Date() } });
  }
}
