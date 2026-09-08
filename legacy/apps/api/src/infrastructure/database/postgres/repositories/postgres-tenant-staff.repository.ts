import { Injectable } from '@nestjs/common';
import type {
  CreateTenantStaff,
  ITenantStaffRepository,
  PaginatedResult,
  PaginationParams,
  StaffStatus,
  TenantStaff,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { TenantStaffPgMappers } from '../mappers/tenant-staff.mapper';

@Injectable()
export class PostgresTenantStaffRepository implements ITenantStaffRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): TenantStaff {
    return TenantStaffPgMappers.toDomain(row as Record<string, unknown>) as TenantStaff;
  }

  async findById(id: string): Promise<TenantStaff | null> {
    const row = await this.prisma.tenantStaff.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<TenantStaff | null> {
    const row = await this.prisma.tenantStaff.findUnique({ where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } } });
    return row ? this.toDomain(row) : null;
  }

  async findByTenant(tenantId: string, pagination: PaginationParams): Promise<PaginatedResult<TenantStaff>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { tenant_id: tenantId };
    const [rows, total] = await Promise.all([
      this.prisma.tenantStaff.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { invited_at: 'desc' } }),
      this.prisma.tenantStaff.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findByUser(userId: string): Promise<TenantStaff[]> {
    const rows = await this.prisma.tenantStaff.findMany({ where: { user_id: userId } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreateTenantStaff): Promise<TenantStaff> {
    const row = await this.prisma.tenantStaff.create({
      data: TenantStaffPgMappers.toPersistence(data as Partial<TenantStaff>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<TenantStaff>): Promise<TenantStaff> {
    const row = await this.prisma.tenantStaff.update({ where: { id }, data: TenantStaffPgMappers.toPersistence(data) as never });
    return this.toDomain(row);
  }

  async setStatus(tenantId: string, userId: string, status: StaffStatus): Promise<void> {
    await this.prisma.tenantStaff.updateMany({
      where: { tenant_id: tenantId, user_id: userId },
      data: { status },
    });
  }
}
