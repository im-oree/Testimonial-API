export type AppStatus = 'active' | 'disabled';

export interface App {
  /** Internal UUID primary key. */
  id: string;
  /** Public-facing id, e.g. "app_7c1e9b" — used in embeds/widgets/SDKs. */
  publicId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: AppStatus;
  /** Hard quotas on the App row; tenant-level ceilings come from the plan (billing module, Doc 2). */
  quotaTestimonialsPerMonth: number;
  quotaWidgetsMax: number;
  quotaFormsMax: number;
  quotaSeatMax: number;
  /** Runtime CORS whitelist — enforced by origin guard (README §9, Doc 3). */
  allowedOrigins: string[];
  ipAllowList: string[] | null;
  requireCaptchaOnForms: boolean;
  /** Archive marker (SQL: archived_at). Archived apps are hidden from lists but rows persist. */
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateApp = Omit<
  App,
  'id' | 'createdAt' | 'updatedAt' | 'allowedOrigins' | 'quotaTestimonialsPerMonth' | 'quotaWidgetsMax' | 'quotaFormsMax' | 'quotaSeatMax' | 'archivedAt'
>;
