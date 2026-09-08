import type { CreateTenant, Tenant, TenantStatus } from '../entities/tenant.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByCustomDomain(domain: string): Promise<Tenant | null>;
  findMany(
    filters: { status?: TenantStatus; search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Tenant>>;
  create(data: CreateTenant): Promise<Tenant>;
  update(id: string, data: Partial<Tenant>): Promise<Tenant>;
  incrementUsageCounter(
    id: string,
    field: 'testimonialsThisMonth' | 'appsCount' | 'staffCount',
    by: number,
  ): Promise<void>;
  softDelete(id: string): Promise<void>;
}
