import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { TwitterService } from './twitter.service';
import { AiClassifierService } from './ai-classifier.service';
import { ZapierService } from './zapier.service';

@Module({
  controllers: [IntegrationsController],
  providers: [TwitterService, AiClassifierService, ZapierService],
  exports: [TwitterService, AiClassifierService],
})
export class IntegrationsModule {}
