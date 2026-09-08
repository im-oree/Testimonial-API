import { Injectable } from '@nestjs/common';
import type {
  CreateIntegration,
  IIntegrationRepository,
  Integration,
  IntegrationProvider,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { IntegrationPgMappers } from '../mappers/integration.mapper';

@Injectable()
export class PostgresIntegrationRepository implements IIntegrationRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Integration {
    return IntegrationPgMappers.toDomain(row as Record<string, unknown>) as Integration;
  }

  async findById(id: string): Promise<Integration | null> {
    const row = await this.prisma.integration.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByAppAndProvider(appId: string, provider: IntegrationProvider): Promise<Integration | null> {
    const row = await this.prisma.integration.findUnique({ where: { app_id_provider: { app_id: appId, provider } } });
    return row ? this.toDomain(row) : null;
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Integration>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { app_id: appId };
    const [rows, total] = await Promise.all([
      this.prisma.integration.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.integration.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async create(data: CreateIntegration): Promise<Integration> {
    const row = await this.prisma.integration.create({ data: IntegrationPgMappers.toPersistence(data as Partial<Integration>) as never });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Integration>): Promise<Integration> {
    const row = await this.prisma.integration.update({ where: { id }, data: IntegrationPgMappers.toPersistence(data) as never });
    return this.toDomain(row);
  }

  async delete(appId: string, provider: IntegrationProvider): Promise<void> {
    await this.prisma.integration.deleteMany({ where: { app_id: appId, provider } });
  }
}
