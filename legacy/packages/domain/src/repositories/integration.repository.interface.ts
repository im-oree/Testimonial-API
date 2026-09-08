import type { CreateIntegration, Integration, IntegrationProvider } from '../entities/integration.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IIntegrationRepository {
  findById(id: string): Promise<Integration | null>;
  findByAppAndProvider(appId: string, provider: IntegrationProvider): Promise<Integration | null>;
  findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Integration>>;
  create(data: CreateIntegration): Promise<Integration>;
  update(id: string, data: Partial<Integration>): Promise<Integration>;
  delete(appId: string, provider: IntegrationProvider): Promise<void>;
}
