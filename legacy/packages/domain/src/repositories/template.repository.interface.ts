import type { CreateTemplate, Template, TemplateType } from '../entities/template.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface ITemplateRepository {
  findById(id: string): Promise<Template | null>;
  findActiveByType(type: TemplateType): Promise<Template[]>;
  findMany(filters: { type?: TemplateType }, pagination: PaginationParams): Promise<PaginatedResult<Template>>;
  create(data: CreateTemplate): Promise<Template>;
  /** Version bump is an explicit service concern (widgets pin templateVersion) — Doc 2. */
  update(id: string, data: Partial<Template>): Promise<Template>;
}
