import { startWorker } from './infrastructure/bootstrap';

/**
 * Testimonial API — async worker entrypoint (separate deployable, README §3).
 *
 * One worker process per queue: QUEUE_NAME selects the processor
 * (social-import | webhook-delivery | stats-aggregation | email-digest |
 * quota-reset; default social-import). Repository adapters are shared with
 * apps/api via domain ports; Doc 2 lifts adapter implementations into a
 * shared persistence package so this process never drifts from the API.
 */
const QUEUE_NAME = process.env.QUEUE_NAME ?? 'social-import';
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('[worker] REDIS_URL is required to connect to the queue broker.');
  process.exit(1);
}

startWorker({ queueName: QUEUE_NAME, redisUrl: REDIS_URL });
