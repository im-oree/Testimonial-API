import type { CreateTenantStaff, StaffStatus, TenantStaff } from '../entities/tenant-staff.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface ITenantStaffRepository {
  findById(id: string): Promise<TenantStaff | null>;
  findByTenantAndUser(tenantId: string, userId: string): Promise<TenantStaff | null>;
  findByTenant(tenantId: string, pagination: PaginationParams): Promise<PaginatedResult<TenantStaff>>;
  findByUser(userId: string): Promise<TenantStaff[]>;
  create(data: CreateTenantStaff): Promise<TenantStaff>;
  update(id: string, data: Partial<TenantStaff>): Promise<TenantStaff>;
  /** e.g. staff.status -> 'disabled' on suspend; role changes also flow through update(). */
  setStatus(tenantId: string, userId: string, status: StaffStatus): Promise<void>;
}
