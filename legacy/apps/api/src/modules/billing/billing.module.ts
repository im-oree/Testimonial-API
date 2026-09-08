import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { QuotaService } from './quota.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, QuotaService, StripeService],
  exports: [BillingService, QuotaService],
})
export class BillingModule {}
