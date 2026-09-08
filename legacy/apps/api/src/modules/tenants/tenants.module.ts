import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { StaffController } from './staff.controller';
import { TenantService } from './tenant.service';
import { StaffService } from './staff.service';
import { BrandingService } from './branding.service';

@Module({
  controllers: [TenantController, StaffController],
  providers: [TenantService, StaffService, BrandingService],
  exports: [TenantService, BrandingService],
})
export class TenantsModule {}
