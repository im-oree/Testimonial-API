import type { CreateTestimonial, Testimonial, TestimonialSource, TestimonialStatus } from '../entities/testimonial.entity';
import type { PaginatedResult, PaginationParams, TimeRangeFilter } from './common.types';

export interface TestimonialFilters {
  appId: string;
  environment?: 'live' | 'test';
  status?: TestimonialStatus | TestimonialStatus[];
  tags?: string[];
  minRating?: number;
  featuredOnly?: boolean;
  source?: TestimonialSource;
  /** Full-text search on message/authorName — prototype: substring match (ILIKE). */
  search?: string;
  createdAt?: TimeRangeFilter;
  authorName?: string;
}

export interface TestimonialStatsSummary {
  total: number;
  avgRating: number;
  bySource: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface ITestimonialRepository {
  findById(id: string): Promise<Testimonial | null>;
  findMany(filters: TestimonialFilters, pagination: PaginationParams): Promise<PaginatedResult<Testimonial>>;
  findByFingerprint(appId: string, fingerprint: string): Promise<Testimonial | null>;
  create(data: CreateTestimonial): Promise<Testimonial>;
  update(id: string, data: Partial<Testimonial>): Promise<Testimonial>;
  softDelete(id: string): Promise<void>;
  bulkUpdateStatus(ids: string[], status: TestimonialStatus, reviewedBy: string): Promise<number>;
  countByStatus(appId: string): Promise<Record<TestimonialStatus, number>>;
  getStatsSummary(appId: string): Promise<TestimonialStatsSummary>;
}
