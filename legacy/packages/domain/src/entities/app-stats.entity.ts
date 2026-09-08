/** Denormalized per-app stats read-model, refreshed by the worker
 *  (stats-aggregation processor). Dashboard reads never aggregate live. */
export interface AppStats {
  appId: string;
  totalTestimonials: number;
  approvedCount: number;
  pendingCount: number;
  avgRating: number;
  bySource: Record<string, number>;
  /** "2025-01": 34 */
  byMonth: Record<string, number>;
  updatedAt: Date;
}

export type CreateAppStats = Omit<AppStats, 'updatedAt'>;
