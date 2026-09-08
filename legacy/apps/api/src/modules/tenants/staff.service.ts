import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ITenantStaffRepository } from '@testimonial-api/domain';

/**
 * StaffService — tenant staff lifecycle (invite/role/permissions/disable).
 * Role→permission defaults come from @testimonial-api/shared-types RBAC
 * catalogue; enforcement engine ships in Doc 2.
 */
@Injectable()
export class StaffService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT_STAFF) private readonly staff: ITenantStaffRepository,
  ) {}

  // list / invite / setRole / disable — Doc 2 (with RBAC + invites + email).
}
