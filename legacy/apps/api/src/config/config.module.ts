import { Global, Module } from '@nestjs/common';
import { RuntimeConfigService } from './runtime-config.service';

/**
 * ConfigModule — global provider of RuntimeConfigService (typed env +
 * runtime flags). Global so ANY module (common, features, guards) can inject
 * it without import chains. Redis-backed propagation: Doc 2.
 */
@Global()
@Module({
  providers: [RuntimeConfigService],
  exports: [RuntimeConfigService],
})
export class ConfigModule {}
