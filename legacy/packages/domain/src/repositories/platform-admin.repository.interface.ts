import type { CreatePlatformAdmin, PlatformAdmin } from '../entities/platform-admin.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IPlatformAdminRepository {
  findById(id: string): Promise<PlatformAdmin | null>;
  findByUserId(userId: string): Promise<PlatformAdmin | null>;
  findMany(filters: { search?: string }, pagination: PaginationParams): Promise<PaginatedResult<PlatformAdmin>>;
  create(data: CreatePlatformAdmin): Promise<PlatformAdmin>;
  update(id: string, data: Partial<PlatformAdmin>): Promise<PlatformAdmin>;
}
