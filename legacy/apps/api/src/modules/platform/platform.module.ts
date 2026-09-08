import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformStaffController } from './platform-staff.controller';
import { PlatformTemplatesController } from './platform-templates.controller';
import { PlatformPlansController } from './platform-plans.controller';
import { PlatformSecurityController } from './platform-security.controller';
import { PlatformAuditController } from './platform-audit.controller';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { ImpersonationService } from './impersonation.service';
import { PlatformAnalyticsService } from './platform-analytics.service';

@Module({
  imports: [TenantsModule],
  controllers: [
    PlatformTenantsController,
    PlatformStaffController,
    PlatformTemplatesController,
    PlatformPlansController,
    PlatformSecurityController,
    PlatformAuditController,
  ],
  providers: [TenantProvisioningService, ImpersonationService, PlatformAnalyticsService],
  exports: [TenantProvisioningService, ImpersonationService],
})
export class PlatformModule {}
