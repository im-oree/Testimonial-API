import type { ActorType, AuditLog, CreateAuditLog } from '../entities/audit-log.entity';
import type { PaginatedResult, PaginationParams, TimeRangeFilter } from './common.types';

export interface AuditLogFilters {
  tenantId?: string;
  actorId?: string;
  actorType?: ActorType;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: TimeRangeFilter;
}

/** Append-only. */
export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findMany(filters: AuditLogFilters, pagination: PaginationParams): Promise<PaginatedResult<AuditLog>>;
  create(data: CreateAuditLog): Promise<AuditLog>;
  /** Also used by the platform data-subject-request handler (README §31). */
  findManyByTarget(targetType: string, targetId: string, pagination: PaginationParams): Promise<PaginatedResult<AuditLog>>;
}
