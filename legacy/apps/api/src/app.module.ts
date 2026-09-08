import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AppsModule } from './modules/apps/apps.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { FormsModule } from './modules/forms/forms.module';
import { WidgetsModule } from './modules/widgets/widgets.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BillingModule } from './modules/billing/billing.module';
import { DemoModule } from './modules/demo/demo.module'; // DEV-ONLY local demo slice (remove with Doc-3 routes)
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

/**
 * Root module — module-to-table ownership follows docs/01-skeleton.md §10.
 * InfrastructureModule (global) carries DatabaseModule: the single place
 * the storage engine is chosen (DATABASE_PROVIDER env). ConfigModule
 * (global) provides RuntimeConfigService everywhere.
 */
@Module({
  imports: [
    ConfigModule,
    CommonModule,
    InfrastructureModule,
    AuditModule,
    AuthModule,
    NotificationsModule,
    RealtimeModule,
    PlatformModule,
    TenantsModule,
    AppsModule,
    TestimonialsModule,
    FormsModule,
    WidgetsModule,
    TemplatesModule,
    IntegrationsModule,
    WebhooksModule,
    BillingModule,
    DemoModule, // DEV-ONLY: in-memory auth + seed data for preview testing
  ],
})
export class AppModule {}
