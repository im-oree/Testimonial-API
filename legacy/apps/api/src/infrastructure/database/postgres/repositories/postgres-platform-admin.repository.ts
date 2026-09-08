import { Injectable } from '@nestjs/common';
import type {
  CreatePlatformAdmin,
  IPlatformAdminRepository,
  PaginatedResult,
  PaginationParams,
  PlatformAdmin,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { PlatformAdminPgMappers } from '../mappers/platform-admin.mapper';

@Injectable()
export class PostgresPlatformAdminRepository implements IPlatformAdminRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): PlatformAdmin {
    return PlatformAdminPgMappers.toDomain(row as Record<string, unknown>) as PlatformAdmin;
  }

  async findById(id: string): Promise<PlatformAdmin | null> {
    const row = await this.prisma.platformAdmin.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<PlatformAdmin | null> {
    const row = await this.prisma.platformAdmin.findUnique({ where: { user_id: userId } });
    return row ? this.toDomain(row) : null;
  }

  async findMany(
    filters: { search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<PlatformAdmin>> {
    const where = filters.search
      ? ({ OR: [{ user_id: { contains: filters.search, mode: 'insensitive' } }] } as never)
      : undefined;
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.platformAdmin.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.platformAdmin.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async create(data: CreatePlatformAdmin): Promise<PlatformAdmin> {
    const row = await this.prisma.platformAdmin.create({
      data: PlatformAdminPgMappers.toPersistence(data as Partial<PlatformAdmin>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
    const row = await this.prisma.platformAdmin.update({
      where: { id },
      data: PlatformAdminPgMappers.toPersistence(data) as never,
    });
    return this.toDomain(row);
  }
}
