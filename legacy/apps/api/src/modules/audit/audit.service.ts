import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ActorType, AuditLog, CreateAuditLog, IAuditLogRepository } from '@testimonial-api/domain';

/**
 * AuditService — append-only audit trail (README §13/§27; Doc 1 §6 notes
 * monthly partitioning in SQL). Real, usable from day one: every mutation
 * call-site will push entries through this service.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(REPOSITORY_TOKENS.AUDIT_LOG) private readonly auditLogs: IAuditLogRepository,
  ) {}

  async record(input: {
    actorId: string | null;
    actorType: ActorType;
    actorLabel?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    tenantId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    const entry: CreateAuditLog = {
      actorId: input.actorId,
      actorType: input.actorType,
      actorLabel: input.actorLabel ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      tenantId: input.tenantId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    };
    return this.auditLogs.create(entry);
  }

  query() {
    return this.auditLogs;
  }
}
