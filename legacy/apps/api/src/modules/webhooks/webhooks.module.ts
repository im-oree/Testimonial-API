import { Module } from '@nestjs/common';
import { WebhooksOutboundController } from './webhooks-outbound.controller';
import { WebhooksInboundController } from './webhooks-inbound.controller';
import { WebhookDispatchService } from './webhook-dispatch.service';

@Module({
  controllers: [WebhooksOutboundController, WebhooksInboundController],
  providers: [WebhookDispatchService],
  exports: [WebhookDispatchService],
})
export class WebhooksModule {}
