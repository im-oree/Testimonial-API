import { Injectable } from '@nestjs/common';
import type {
  CreateTemplate,
  ITemplateRepository,
  PaginatedResult,
  PaginationParams,
  Template,
  TemplateType,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { TemplatePgMappers } from '../mappers/template.mapper';

@Injectable()
export class PostgresTemplateRepository implements ITemplateRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Template {
    return TemplatePgMappers.toDomain(row as Record<string, unknown>) as Template;
  }

  async findById(id: string): Promise<Template | null> {
    const row = await this.prisma.template.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByType(type: TemplateType): Promise<Template[]> {
    const rows = await this.prisma.template.findMany({ where: { type, status: 'active' }, orderBy: { name: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async findMany(filters: { type?: TemplateType }, pagination: PaginationParams): Promise<PaginatedResult<Template>> {
    const where = filters.type ? { type: filters.type } : {};
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.template.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.template.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async create(data: CreateTemplate): Promise<Template> {
    const row = await this.prisma.template.create({ data: TemplatePgMappers.toPersistence(data as Partial<Template>) as never });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Template>): Promise<Template> {
    const row = await this.prisma.template.update({
      where: { id },
      data: { ...TemplatePgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }
}
