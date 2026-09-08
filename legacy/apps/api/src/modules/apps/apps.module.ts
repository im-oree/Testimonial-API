import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyService } from './api-key.service';
import { OriginConfigService } from './origin-config.service';

@Module({
  controllers: [AppController],
  providers: [AppService, ApiKeyService, OriginConfigService],
  exports: [AppService, ApiKeyService, OriginConfigService],
})
export class AppsModule {}
