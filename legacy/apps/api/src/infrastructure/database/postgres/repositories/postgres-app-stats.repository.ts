import { Injectable } from '@nestjs/common';
import type { AppStats, CreateAppStats, IAppStatsRepository } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AppStatsPgMappers } from '../mappers/app-stats.mapper';

@Injectable()
export class PostgresAppStatsRepository implements IAppStatsRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): AppStats {
    return AppStatsPgMappers.toDomain(row as Record<string, unknown>) as AppStats;
  }

  async findByApp(appId: string): Promise<AppStats | null> {
    const row = await this.prisma.appStats.findUnique({ where: { app_id: appId } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(appId: string, data: Partial<CreateAppStats>): Promise<AppStats> {
    const payload = AppStatsPgMappers.toPersistence(data as Partial<AppStats>);
    const row = await this.prisma.appStats.upsert({
      where: { app_id: appId },
      create: { app_id: appId, ...payload } as never,
      update: { ...payload, updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }

  async recompute(appId: string): Promise<AppStats> {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { app_id: appId, deleted_at: null },
      select: { status: true, source: true, rating: true, created_at: true },
    });
    const live = testimonials.filter((t) => t.status !== 'archived');
    const approved = live.filter((t) => t.status === 'approved');
    const pending = live.filter((t) => t.status === 'pending');
    const rated = approved.filter((t) => t.rating !== null);
    const avgRating = rated.length ? rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length : 0;
    const bySource: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const t of live) {
      bySource[t.source] = (bySource[t.source] ?? 0) + 1;
      const key = `${t.created_at.getUTCFullYear()}-${String(t.created_at.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    return this.upsert(appId, {
      totalTestimonials: live.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      avgRating: Math.round(avgRating * 100) / 100,
      bySource,
      byMonth,
    });
  }
}
