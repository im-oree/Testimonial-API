import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import { RedisClient } from './cache/redis.client';
import { CacheServiceImpl } from './cache/cache.service';
import { GcsStorageService } from './storage/gcs-storage.service';
import { BullQueueProvider } from './queue/bullmq.provider';
import { EmailProvider } from './email/resend.provider';

/**
 * InfrastructureModule — aggregates ALL storage-adjacent providers:
 *  • DatabaseModule (repository tokens; engine chosen by DATABASE_PROVIDER)
 *  • AiModule (Doc 2 Additive A orchestration engine)
 *  • cache (Redis w/ in-memory fallback), object storage (GCS),
 *    job queue (BullMQ), email (Resend)
 *
 * Feature modules consume these via DI tokens/classes, never via imports
 * of adapters (eslint-plugin-repo-boundaries enforces the boundary).
 */
@Global()
@Module({
  imports: [DatabaseModule, AiModule],
  providers: [RedisClient, CacheServiceImpl, GcsStorageService, BullQueueProvider, EmailProvider],
  exports: [DatabaseModule, AiModule, RedisClient, CacheServiceImpl, GcsStorageService, BullQueueProvider, EmailProvider],
})
export class InfrastructureModule {}
