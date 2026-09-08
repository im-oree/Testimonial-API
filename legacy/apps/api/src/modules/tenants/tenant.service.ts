import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { CreateTenant, ITenantRepository, Tenant } from '@testimonial-api/domain';
import { generatePublicId } from '@testimonial-api/domain';
import { AuditService } from '../audit/audit.service';

/**
 * TenantService — tenant lifecycle CRUD used by the tenant dashboard.
 * Deep logic (plan provisioning, quotas, branding, billing rollover) is Doc 2.
 */
@Injectable()
export class TenantService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT) private readonly tenants: ITenantRepository,
    private readonly audit: AuditService,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.findById(id);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.findBySlug(slug);
  }

  /** Create with a unique slug derived from the name (service-level rule, engine-agnostic). */
  async create(input: CreateTenant & { name: string }): Promise<Tenant> {
    const slug = await this.uniqueSlug(input.name);
    const tenant = await this.tenants.create({ ...input, slug });
    await this.audit.record({
      actorId: input.ownerEmail,
      actorType: 'system',
      action: 'tenant.create',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: { source: 'onboarding' },
    });
    return tenant;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const candidate = base || 'tenant';
    const existing = await this.tenants.findBySlug(candidate);
    if (!existing) return candidate;
    // Collision → short suffix (same id alphabet as public ids).
    return `${candidate}-${generatePublicId('t').split('_')[1]}`;
  }

  async assertSlugAvailable(slug: string): Promise<void> {
    const existing = await this.tenants.findBySlug(slug);
    if (existing) {
      throw new ConflictError(`Tenant slug "${slug}" is already taken`);
    }
  }
}
