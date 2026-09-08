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
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { TestimonialFirestoreMapper } from '../mappers/testimonial.mapper';

/**
 * Firestore testimonial repository.
 *
 * NOTE: all heavy filtering is client-side over the app's testimonial set —
 * a deliberate prototype trade-off (avoids composite-index sprawl; volumes
 * are capped by quota tables). PostgreSQL executes these predicates in SQL;
 * the behavioral parity test suite keeps both honest.
 */
@Injectable()
export class FirestoreTestimonialRepository
  extends FirestoreBaseRepository<Testimonial>
  implements ITestimonialRepository
{
  protected readonly collectionName = 'testimonials';
  protected readonly mapper = TestimonialFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Testimonial>): Partial<Testimonial> {
    return {
      environment: 'live',
      ratingType: 'star5',
      status: 'pending',
      source: 'manual',
      mediaUrls: [],
      tags: [],
      featured: false,
      sortOrder: 0,
      customFields: {},
      consentGiven: false,
    };
  }

  async findMany(
    filters: TestimonialFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Testimonial>> {
    const all = await this.fetchAll('appId', filters.appId);
    return this.pageInMemory(this.applyFilters(all, filters), pagination);
  }

  applyFilters(items: Testimonial[], filters: TestimonialFilters): Testimonial[] {
    let out = items.filter((t) => !t.deletedAt);
    if (filters.environment) out = out.filter((t) => t.environment === filters.environment);
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      out = out.filter((t) => statuses.includes(t.status));
    }
    if (filters.source) out = out.filter((t) => t.source === filters.source);
    if (filters.minRating !== undefined && filters.minRating !== null) {
      out = out.filter((t) => t.rating !== null && t.rating >= filters.minRating!);
    }
    if (filters.featuredOnly) out = out.filter((t) => t.featured);
    if (filters.tags && filters.tags.length > 0) {
      out = out.filter((t) => filters.tags!.every((tag) => t.tags.includes(tag)));
    }
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      out = out.filter(
        (t) => t.message.toLowerCase().includes(needle) || t.authorName.toLowerCase().includes(needle),
      );
    }
    if (filters.authorName) out = out.filter((t) => t.authorName.toLowerCase().includes(filters.authorName!.toLowerCase()));
    if (filters.createdAt?.from) out = out.filter((t) => t.createdAt >= filters.createdAt!.from!);
    if (filters.createdAt?.to) out = out.filter((t) => t.createdAt <= filters.createdAt!.to!);
    return out;
  }

  async findByFingerprint(appId: string, fingerprint: string): Promise<Testimonial | null> {
    const all = await this.fetchAll('appId', appId);
    return all.find((t) => t.fingerprint === fingerprint && !t.deletedAt) ?? null;
  }

  override create(data: CreateTestimonial): Promise<Testimonial> {
    return super.create(data as Partial<Testimonial>);
  }

  override softDelete(id: string): Promise<void> {
    return super.softDelete(id);
  }

  async bulkUpdateStatus(ids: string[], status: TestimonialStatus, reviewedBy: string): Promise<number> {
    const batch = this.client.db.batch();
    for (const id of ids) {
      batch.update(this.col().doc(id), { status, reviewedBy, reviewedAt: new Date(), updatedAt: new Date() });
    }
    await batch.commit();
    return ids.length;
  }

  async countByStatus(appId: string): Promise<Record<TestimonialStatus, number>> {
    const all = await this.fetchAll('appId', appId);
    const live = all.filter((t) => !t.deletedAt);
    return {
      pending: live.filter((t) => t.status === 'pending').length,
      approved: live.filter((t) => t.status === 'approved').length,
      rejected: live.filter((t) => t.status === 'rejected').length,
      archived: live.filter((t) => t.status === 'archived').length,
    };
  }

  async getStatsSummary(appId: string): Promise<TestimonialStatsSummary> {
    const all = await this.fetchAll('appId', appId);
    const live = all.filter((t) => !t.deletedAt);
    const rated = live.filter((t) => t.rating !== null);
    const avgRating =
      rated.length > 0 ? rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length : 0;
    const bySource: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const t of live) {
      bySource[t.source] = (bySource[t.source] ?? 0) + 1;
      const key = `${t.createdAt.getUTCFullYear()}-${String(t.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    return { total: live.length, avgRating: Math.round(avgRating * 100) / 100, bySource, byMonth };
  }
}
