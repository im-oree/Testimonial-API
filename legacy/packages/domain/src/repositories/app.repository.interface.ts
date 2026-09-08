import type { App, CreateApp } from '../entities/app.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IAppRepository {
  findById(id: string): Promise<App | null>;
  findByPublicId(publicId: string): Promise<App | null>;
  findByTenant(tenantId: string): Promise<App[]>;
  findMany(filters: { tenantId?: string; search?: string }, pagination: PaginationParams): Promise<PaginatedResult<App>>;
  create(data: CreateApp & { publicId: string }): Promise<App>;
  update(id: string, data: Partial<App>): Promise<App>;
  updateAllowedOrigins(id: string, origins: string[]): Promise<void>;
  archive(id: string): Promise<void>;
}
