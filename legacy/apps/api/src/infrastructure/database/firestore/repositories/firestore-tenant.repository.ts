import { Injectable } from '@nestjs/common';
import type {
  CreateTenant,
  ITenantRepository,
  PaginatedResult,
  PaginationParams,
  Tenant,
  TenantStatus,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { TenantFirestoreMapper } from '../mappers/tenant.mapper';

@Injectable()
export class FirestoreTenantRepository extends FirestoreBaseRepository<Tenant> implements ITenantRepository {
  protected readonly collectionName = 'tenants';
  protected readonly mapper = TenantFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Tenant>): Partial<Tenant> {
    return {
      brandColor: '#4F46E5',
      plan: 'free',
      status: 'pending_setup',
      customDomainVerified: false,
      testimonialsThisMonth: 0,
      appsCount: 0,
      staffCount: 0,
    };
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.findByField('slug', slug);
  }

  findByCustomDomain(domain: string): Promise<Tenant | null> {
    return this.findByField('customDomain', domain);
  }

  async findMany(
    filters: { status?: TenantStatus; search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Tenant>> {
    // deletedAt == null ⇒ soft-deleted tenants excluded (single-field index).
    const all = await this.fetchAll('deletedAt', null);
    const byStatus = filters.status ? all.filter((t) => t.status === filters.status) : all;
    const bySearch = filters.search
      ? byStatus.filter((t) => t.name.toLowerCase().includes(filters.search!.toLowerCase()))
      : byStatus;
    return this.pageInMemory(bySearch, pagination);
  }

  override create(data: CreateTenant): Promise<Tenant> {
    return super.create(data as Partial<Tenant>);
  }

  async incrementUsageCounter(
    id: string,
    field: 'testimonialsThisMonth' | 'appsCount' | 'staffCount',
    by: number,
  ): Promise<void> {
    const snap = await this.col().doc(id).get();
    const current = Number((snap.data() ?? {})[field] ?? 0);
    await this.col().doc(id).update({
      [field]: Math.max(0, current + by),
      updatedAt: new Date(),
    });
  }

  override softDelete(id: string): Promise<void> {
    return super.softDelete(id);
  }
}
