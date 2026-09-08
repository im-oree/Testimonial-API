export type ActorType = 'platform_admin' | 'tenant_staff' | 'api_key' | 'system';

export interface AuditLog {
  /** BIGSERIAL id surfaced as string (JS numbers lose precision past 2^53). */
  id: string;
  actorId: string | null;
  actorType: ActorType;
  /** Resolved name/email for display. */
  actorLabel: string | null;
  /** e.g. 'testimonial.approve', 'app.rotate_key', 'tenant.suspend'. */
  action: string;
  targetType: string | null;
  targetId: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** append-only — no update/delete on audit logs, ever. */
export type CreateAuditLog = Omit<AuditLog, 'id' | 'createdAt'>;
