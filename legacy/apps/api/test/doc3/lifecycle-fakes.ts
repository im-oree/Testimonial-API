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

/** Minimal in-memory Testimonial repo for Doc-3 lifecycle suites. */
export class FakeTestimonialRepo implements ITestimonialRepository {
  rows: Testimonial[] = [];

  seed(...rows: Testimonial[]): void {
    this.rows = [...this.rows, ...rows];
  }

  async findById(id: string): Promise<Testimonial | null> {
    return this.rows.find((t) => t.id === id && t.deletedAt === null) ?? null;
  }

  async findMany(filters: TestimonialFilters, _pagination: PaginationParams): Promise<PaginatedResult<Testimonial>> {
    let out = this.rows.filter((t) => t.appId === filters.appId && t.deletedAt === null);
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      out = out.filter((t) => statuses.includes(t.status));
    }
    if (filters.environment) out = out.filter((t) => t.environment === filters.environment);
    if (filters.minRating !== undefined) out = out.filter((t) => (t.rating ?? 0) >= (filters.minRating ?? 0));
    if (filters.featuredOnly) out = out.filter((t) => t.featured);
    if (filters.tags?.length) out = out.filter((t) => filters.tags!.every((tag) => t.tags.includes(tag)));
    return { items: out, total: out.length, page: 1, pageSize: out.length || 1 };
  }

  async findByFingerprint(appId: string, fingerprint: string): Promise<Testimonial | null> {
    return this.rows.find((t) => t.appId === appId && t.fingerprint === fingerprint && t.deletedAt === null) ?? null;
  }

  async create(data: CreateTestimonial): Promise<Testimonial> {
    const row = makeTestimonial(data as Testimonial);
    this.rows.push(row);
    return row;
  }

  async update(id: string, data: Partial<Testimonial>): Promise<Testimonial> {
    const idx = this.rows.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('missing');
    this.rows[idx] = { ...this.rows[idx], ...data, updatedAt: new Date() };
    return this.rows[idx];
  }

  async softDelete(id: string): Promise<void> {
    const idx = this.rows.findIndex((t) => t.id === id);
    if (idx !== -1) this.rows[idx] = { ...this.rows[idx], deletedAt: new Date() };
  }

  async bulkUpdateStatus(ids: string[], status: TestimonialStatus, reviewedBy: string): Promise<number> {
    let n = 0;
    for (const id of ids) {
      const idx = this.rows.findIndex((t) => t.id === id);
      if (idx !== -1) {
        this.rows[idx] = { ...this.rows[idx], status, reviewedBy, reviewedAt: new Date() };
        n += 1;
      }
    }
    return n;
  }

  async countByStatus(appId: string): Promise<Record<TestimonialStatus, number>> {
    const out: Record<TestimonialStatus, number> = { pending: 0, approved: 0, rejected: 0, archived: 0 };
    for (const t of this.rows) if (t.appId === appId && t.deletedAt === null) out[t.status] += 1;
    return out;
  }

  async getStatsSummary(): Promise<TestimonialStatsSummary> {
    return { total: this.rows.length, avgRating: 0, bySource: {}, byMonth: {} };
  }
}

export function makeTestimonial(partial: Partial<Testimonial> = {}): Testimonial {
  return {
    id: partial.id ?? `t-${Math.random().toString(36).slice(2)}`,
    appId: partial.appId ?? 'app-1',
    environment: partial.environment ?? 'live',
    authorName: partial.authorName ?? 'Ada',
    authorTitle: null,
    authorCompany: null,
    authorAvatarUrl: null,
    authorEmail: null,
    message: partial.message ?? 'Great product',
    rating: partial.rating ?? 5,
    ratingType: 'star5',
    mediaUrls: [],
    videoUrl: null,
    source: partial.source ?? 'manual',
    sourceRef: null,
    status: partial.status ?? 'pending',
    reviewedBy: partial.reviewedBy ?? null,
    reviewedAt: partial.reviewedAt ?? null,
    rejectionReason: partial.rejectionReason ?? null,
    tags: [],
    featured: false,
    sortOrder: 0,
    customFields: {},
    fingerprint: partial.fingerprint ?? `fp-${partial.id ?? 'x'}`,
    language: null,
    consentGiven: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

/** Minimal AuditService stand-in (record is the only method lifecycle uses). */
export function fakeAudit(): { record: (e: unknown) => Promise<void> } {
  const calls: unknown[] = [];
  return {
    calls,
    async record(e: unknown) {
      calls.push(e);
    },
  } as unknown as { record: (e: unknown) => Promise<void>; calls: unknown[] };
}
