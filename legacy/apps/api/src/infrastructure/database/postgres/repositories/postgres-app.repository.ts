import { Injectable } from '@nestjs/common';
import type { App, CreateApp, IAppRepository, PaginatedResult, PaginationParams } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AppPgMappers } from '../mappers/app.mapper';

@Injectable()
export class PostgresAppRepository implements IAppRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): App {
    return AppPgMappers.toDomain(row as Record<string, unknown>) as App;
  }

  async findById(id: string): Promise<App | null> {
    const row = await this.prisma.app.findFirst({ where: { id, archived_at: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByPublicId(publicId: string): Promise<App | null> {
    const row = await this.prisma.app.findFirst({ where: { public_id: publicId, archived_at: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByTenant(tenantId: string): Promise<App[]> {
    const rows = await this.prisma.app.findMany({ where: { tenant_id: tenantId, archived_at: null } });
    return rows.map((r) => this.toDomain(r));
  }

  async findMany(
    filters: { tenantId?: string; search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<App>> {
    const where = {
      archived_at: null,
      ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' as const } } : {}),
    };
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.app.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.app.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async create(data: CreateApp & { publicId: string }): Promise<App> {
    const row = await this.prisma.app.create({ data: AppPgMappers.toPersistence(data as Partial<App>) as never });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<App>): Promise<App> {
    const row = await this.prisma.app.update({
      where: { id },
      data: { ...AppPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async updateAllowedOrigins(id: string, origins: string[]): Promise<void> {
    await this.prisma.app.update({ where: { id }, data: { allowed_origins: origins, updated_at: new Date() } });
  }

  async archive(id: string): Promise<void> {
    await this.prisma.app.update({ where: { id }, data: { archived_at: new Date(), updated_at: new Date() } });
  }
}
