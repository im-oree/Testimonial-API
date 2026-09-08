import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { ChannelAuthService } from './channel-auth.service';

@Global()
@Module({
  providers: [RealtimeGateway, ChannelAuthService],
  exports: [RealtimeGateway, ChannelAuthService],
})
export class RealtimeModule {}
