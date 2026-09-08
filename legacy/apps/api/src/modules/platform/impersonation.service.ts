import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

/**
 * ImpersonationService — platform support access INTO a tenant
 * (README §27): 15-min time-boxed sessions, watermark banner, every action
 * tagged actorType=platform_admin + onBehalfOf in audit. Implementation Doc 2.
 */
@Injectable()
export class ImpersonationService {
  constructor(private readonly audit: AuditService) {
    void this.audit;
  }
}
