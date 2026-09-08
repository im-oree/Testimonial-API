import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { IPlatformAdminRepository, ITenantStaffRepository, IUserRepository } from '@testimonial-api/domain';

/**
 * AuthService — session lifecycle for humans (README §7).
 * Doc 2 delivers the Auth Engine: Firebase token verification, session
 * issuance/rotation/revocation, MFA, and the live permVersion staleness
 * check. Skeleton only wires the identity repositories it will need.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(REPOSITORY_TOKENS.USER) private readonly users: IUserRepository,
    @Inject(REPOSITORY_TOKENS.TENANT_STAFF) private readonly tenantStaff: ITenantStaffRepository,
    @Inject(REPOSITORY_TOKENS.PLATFORM_ADMIN) private readonly platformAdmins: IPlatformAdminRepository,
  ) {
    void this.users;
    void this.tenantStaff;
    void this.platformAdmins;
  }
}
