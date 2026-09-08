import type { AppStats, CreateAppStats } from '../entities/app-stats.entity';

/** Owned by the billing module + worker stats-aggregation processor. */
export interface IAppStatsRepository {
  findByApp(appId: string): Promise<AppStats | null>;
  upsert(appId: string, data: Partial<CreateAppStats>): Promise<AppStats>;
  /** Full recompute after backfill/import — adapter counts from testimonials itself. */
  recompute(appId: string): Promise<AppStats>;
}
