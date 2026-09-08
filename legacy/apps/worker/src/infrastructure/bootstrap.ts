import { Worker, type Processor } from 'bullmq';
import { socialImportProcessor } from '../processors/social-import.processor';
import { webhookDeliveryProcessor } from '../processors/webhook-delivery.processor';
import { statsAggregationProcessor } from '../processors/stats-aggregation.processor';
import { emailDigestProcessor } from '../processors/email-digest.processor';
import { quotaResetProcessor } from '../processors/quota-reset.processor';

/**
 * Queue bootstrap — lives under infrastructure/ because BullMQ is a storage
 * driver per the repo-boundaries rule. One worker per queue (scalable
 * independently); QUEUE_NAME env picks which processor this process runs.
 * Handlers type their own payloads; the Worker callback widens them to
 * BullMQ's generic Processor signature.
 */
const PROCESSORS: Record<string, Processor> = {
  'social-import': socialImportProcessor,
  'webhook-delivery': webhookDeliveryProcessor,
  'stats-aggregation': statsAggregationProcessor,
  'email-digest': emailDigestProcessor,
  'quota-reset': quotaResetProcessor,
};

export function startWorker(opts: { queueName: string; redisUrl: string }): Worker {
  const handler = PROCESSORS[opts.queueName];
  if (!handler) {
    throw new Error(
      `No processor registered for queue "${opts.queueName}". Known: ${Object.keys(PROCESSORS).join(', ')}`,
    );
  }

  const worker = new Worker(
    opts.queueName,
    async (job) => {
      const started = Date.now();
      try {
        await handler(job);
        console.log(`[worker] ${opts.queueName} job ${job.id} ok in ${Date.now() - started}ms`);
      } catch (err) {
        console.error(`[worker] ${opts.queueName} job ${job.id} failed:`, err);
        throw err; // BullMQ applies retry policy / moves to stalled handling
      }
    },
    { connection: { url: opts.redisUrl } },
  );

  worker.on('ready', () => console.log(`[worker] listening on queue "${opts.queueName}"`));
  worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed after attempts: ${err.message}`));

  process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
  });

  return worker;
}
