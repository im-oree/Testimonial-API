import { Injectable } from '@nestjs/common';
import type {
  CreateTenantStaff,
  ITenantStaffRepository,
  PaginatedResult,
  PaginationParams,
  StaffStatus,
  TenantStaff,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { TenantStaffFirestoreMapper } from '../mappers/tenant-staff.mapper';

@Injectable()
export class FirestoreTenantStaffRepository
  extends FirestoreBaseRepository<TenantStaff>
  implements ITenantStaffRepository
{
  protected readonly collectionName = 'tenantStaff';
  protected readonly mapper = TenantStaffFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  findByTenantAndUser(tenantId: string, userId: string): Promise<TenantStaff | null> {
    // Prototype: single-field query + client filter (avoids composite-index sprawl).
    return this.fetchAll('tenantId', tenantId).then((rows) => rows.find((r) => r.userId === userId) ?? null);
  }

  async findByTenant(tenantId: string, pagination: PaginationParams): Promise<PaginatedResult<TenantStaff>> {
    const all = await this.fetchAll('tenantId', tenantId);
    return this.pageInMemory(all, pagination);
  }

  async findByUser(userId: string): Promise<TenantStaff[]> {
    return this.fetchAll('userId', userId);
  }

  override create(data: CreateTenantStaff): Promise<TenantStaff> {
    return super.create(data as Partial<TenantStaff>);
  }

  async setStatus(tenantId: string, userId: string, status: StaffStatus): Promise<void> {
    const member = await this.findByTenantAndUser(tenantId, userId);
    if (member) {
      await this.col().doc(member.id).update({ status });
    }
  }
}
