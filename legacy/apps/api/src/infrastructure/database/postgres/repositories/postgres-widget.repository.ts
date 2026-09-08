import { Injectable } from '@nestjs/common';
import type { CreateWidget, IWidgetRepository, PaginatedResult, PaginationParams, Widget } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { WidgetPgMappers } from '../mappers/widget.mapper';

@Injectable()
export class PostgresWidgetRepository implements IWidgetRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Widget {
    return WidgetPgMappers.toDomain(row as Record<string, unknown>);
  }

  async findById(id: string): Promise<Widget | null> {
    const row = await this.prisma.widget.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Widget>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { app_id: appId };
    const [rows, total] = await Promise.all([
      this.prisma.widget.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.widget.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findPublishedByApp(appId: string): Promise<Widget[]> {
    const rows = await this.prisma.widget.findMany({ where: { app_id: appId, is_published: true } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreateWidget): Promise<Widget> {
    const row = await this.prisma.widget.create({ data: WidgetPgMappers.toPersistence(data) as never });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Widget>): Promise<Widget> {
    const row = await this.prisma.widget.update({
      where: { id },
      data: { ...WidgetPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.widget.delete({ where: { id } });
  }
}
