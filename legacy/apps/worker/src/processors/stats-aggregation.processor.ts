import type { WorkerJob } from '../types';

export interface StatsAggregationPayload {
  appId: string;
}

/**
 * Refreshes the app_stats read-model (README §5.14) from live testimonial
 * data. Dashboard reads never aggregate on the fly.
 * Implementation: Doc 2.
 */
export async function statsAggregationProcessor(job: WorkerJob<StatsAggregationPayload>): Promise<void> {
  void job; // Doc 2
}
