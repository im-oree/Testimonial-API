import { Injectable } from '@nestjs/common';
import type {
  CreateTestimonial,
  ITestimonialRepository,
  PaginatedResult,
  PaginationParams,
  Testimonial,
  TestimonialFilters,
  TestimonialStatsSummary,
  TestimonialStatus,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { TestimonialPgMappers } from '../mappers/testimonial.mapper';
import { sanitizeSearchInput } from '../../../../common/utils/sanitize-search-input';

@Injectable()
export class PostgresTestimonialRepository implements ITestimonialRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Testimonial {
    return TestimonialPgMappers.toDomain(row as Record<string, unknown>) as Testimonial;
  }

  async findById(id: string): Promise<Testimonial | null> {
    const row = await this.prisma.testimonial.findFirst({ where: { id, deleted_at: null } });
    return row ? this.toDomain(row) : null;
  }

  private buildWhere(filters: TestimonialFilters): Record<string, unknown> {
    const where: Record<string, unknown> = { app_id: filters.appId, deleted_at: null };
    if (filters.environment) where.environment = filters.environment;
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
    }
    if (filters.source) where.source = filters.source;
    if (filters.featuredOnly) where.featured = true;
    if (filters.tags && filters.tags.length > 0) {
      // prototype: match if ANY requested tag present (array-contains-any equivalent);
      // AND-semantics lives in the service layer / later doc.
      where.tags = { hasSome: filters.tags };
    }
    const range: Record<string, unknown> = {};
    if (filters.minRating !== undefined && filters.minRating !== null) range.gte = filters.minRating;
    if (range.gte !== undefined) where.rating = range;
    if (filters.search) {
      // Doc 6 §1.3: sanitize search input before it reaches the Prisma
      // `contains` (ILIKE) filter — escape LIKE wildcards, strip SQL chars,
      // cap length. Parameterization alone does not stop `%`-wildcard
      // widening of the match.
      const needle = sanitizeSearchInput(filters.search);
      where.OR = [
        { message: { contains: needle, mode: 'insensitive' } },
        { author_name: { contains: needle, mode: 'insensitive' } },
      ];
    }
    if (filters.authorName) {
      where.author_name = { contains: sanitizeSearchInput(filters.authorName), mode: 'insensitive' };
    }
    if (filters.createdAt?.from || filters.createdAt?.to) {
      where.created_at = {
        ...(filters.createdAt.from ? { gte: filters.createdAt.from } : {}),
        ...(filters.createdAt.to ? { lte: filters.createdAt.to } : {}),
      };
    }
    return where;
  }

  async findMany(
    filters: TestimonialFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Testimonial>> {
    const where = this.buildWhere(filters);
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: pagination.sortDir === 'asc' ? 'asc' : 'desc' },
      }),
      this.prisma.testimonial.count({ where: where as never }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findByFingerprint(appId: string, fingerprint: string): Promise<Testimonial | null> {
    const row = await this.prisma.testimonial.findFirst({
      where: { app_id: appId, fingerprint, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateTestimonial): Promise<Testimonial> {
    const row = await this.prisma.testimonial.create({
      data: TestimonialPgMappers.toPersistence(data as Partial<Testimonial>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Testimonial>): Promise<Testimonial> {
    const row = await this.prisma.testimonial.update({
      where: { id },
      data: { ...TestimonialPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.testimonial.update({ where: { id }, data: { deleted_at: new Date(), updated_at: new Date() } });
  }

  async bulkUpdateStatus(ids: string[], status: TestimonialStatus, reviewedBy: string): Promise<number> {
    const result = await this.prisma.testimonial.updateMany({
      where: { id: { in: ids } },
      data: { status, reviewed_by: reviewedBy, reviewed_at: new Date(), updated_at: new Date() },
    });
    return result.count;
  }

  async countByStatus(appId: string): Promise<Record<TestimonialStatus, number>> {
    const rows = await this.prisma.testimonial.groupBy({
      by: ['status'],
      where: { app_id: appId, deleted_at: null },
      _count: { _all: true },
    });
    const result: Record<TestimonialStatus, number> = { pending: 0, approved: 0, rejected: 0, archived: 0 };
    for (const row of rows) result[row.status as TestimonialStatus] = row._count._all;
    return result;
  }

  async getStatsSummary(appId: string): Promise<TestimonialStatsSummary> {
    const rows = await this.prisma.testimonial.findMany({
      where: { app_id: appId, deleted_at: null },
      select: { source: true, rating: true, created_at: true, status: true },
    });
    const live = rows.filter((r) => r.status !== 'archived');
    const rated = live.filter((r) => r.rating !== null);
    const avgRating = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : 0;
    const bySource: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const r of live) {
      bySource[r.source] = (bySource[r.source] ?? 0) + 1;
      const d = r.created_at;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    return { total: live.length, avgRating: Math.round(avgRating * 100) / 100, bySource, byMonth };
  }
}
