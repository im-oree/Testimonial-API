import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

/**
 * BullMQ queue provider (Redis-backed). Async jobs: social import,
 * webhook delivery, stats aggregation, email digests, quota resets —
 * consumed by the separately-deployed worker (apps/worker, Doc 2).
 *
 * Lazy: only constructs queues when REDIS_URL is set.
 */
@Injectable()
export class BullQueueProvider implements OnModuleDestroy {
  private readonly logger = new Logger(BullQueueProvider.name);
  private readonly queues = new Map<string, Queue>();

  /** Canonical queue names shared with apps/worker. */
  static readonly NAMES = {
    socialImport: 'social-import',
    webhookDelivery: 'webhook-delivery',
    statsAggregation: 'stats-aggregation',
    emailDigest: 'email-digest',
    quotaReset: 'quota-reset',
  } as const;

  queue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error(`Redis not configured (REDIS_URL) — cannot create queue "${name}"`);
    }
    const queue = new Queue(name, { connection: { url } });
    this.queues.set(name, queue);
    this.logger.log(`Queue "${name}" ready`);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) {
      await q.close();
    }
    this.queues.clear();
  }
}
