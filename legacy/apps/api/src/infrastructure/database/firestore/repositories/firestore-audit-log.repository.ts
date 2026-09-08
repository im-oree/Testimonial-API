import { Injectable } from '@nestjs/common';
import type {
  AuditLog,
  AuditLogFilters,
  CreateAuditLog,
  IAuditLogRepository,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { AuditLogFirestoreMapper } from '../mappers/audit-log.mapper';

@Injectable()
export class FirestoreAuditLogRepository extends FirestoreBaseRepository<AuditLog> implements IAuditLogRepository {
  protected readonly collectionName = 'auditLogs';
  protected readonly mapper = AuditLogFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  async findMany(filters: AuditLogFilters, pagination: PaginationParams): Promise<PaginatedResult<AuditLog>> {
    let all: AuditLog[];
    if (filters.tenantId) {
      all = await this.fetchAll('tenantId', filters.tenantId);
    } else {
      const snap = await this.col().orderBy('createdAt', 'desc').limit(1000).get();
      all = snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
    }
    if (filters.actorId) all = all.filter((l) => l.actorId === filters.actorId);
    if (filters.actorType) all = all.filter((l) => l.actorType === filters.actorType);
    if (filters.action) all = all.filter((l) => l.action === filters.action);
    if (filters.targetType) all = all.filter((l) => l.targetType === filters.targetType);
    if (filters.targetId) all = all.filter((l) => l.targetId === filters.targetId);
    if (filters.createdAt?.from) all = all.filter((l) => l.createdAt >= filters.createdAt!.from!);
    if (filters.createdAt?.to) all = all.filter((l) => l.createdAt <= filters.createdAt!.to!);
    return this.pageInMemory(all, pagination);
  }

  async findManyByTarget(
    targetType: string,
    targetId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<AuditLog>> {
    const all = await this.col().get().then((snap) => snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() })));
    return this.pageInMemory(
      all.filter((l) => l.targetType === targetType && l.targetId === targetId),
      pagination,
    );
  }

  override create(data: CreateAuditLog): Promise<AuditLog> {
    return super.create(data as Partial<AuditLog>);
  }
}
