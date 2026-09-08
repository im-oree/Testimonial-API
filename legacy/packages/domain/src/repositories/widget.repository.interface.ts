import type { CreateWidget, Widget } from '../entities/widget.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IWidgetRepository {
  findById(id: string): Promise<Widget | null>;
  findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Widget>>;
  findPublishedByApp(appId: string): Promise<Widget[]>;
  create(data: CreateWidget): Promise<Widget>;
  update(id: string, data: Partial<Widget>): Promise<Widget>;
  delete(id: string): Promise<void>;
}
