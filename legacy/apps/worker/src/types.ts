/**
 * Worker-processor contract types.
 *
 * Processors intentionally do NOT import BullMQ directly — like API services
 * they depend on interfaces. The real BullMQ Job is structurally compatible
 * (id/data/attemptsMade) and is handed in by the queue adapter in
 * infrastructure/ (the only place allowed to import a storage driver).
 */
export interface WorkerJob<T = unknown> {
  id?: string;
  data: T;
  attemptsMade?: number;
}
