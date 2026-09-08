import type { WorkerJob } from '../types';

export interface SocialImportPayload {
  integrationId: string;
  appId: string;
}

/**
 * Social import (README §17.1): Twitter/X recent-search per app → AI
 * classification → candidates ALWAYS enter the moderation queue as
 * pending (never auto-published — permanent safety rule).
 * Implementation: Doc 2 (uses domain ports + shared adapters).
 */
export async function socialImportProcessor(job: WorkerJob<SocialImportPayload>): Promise<void> {
  void job; // Doc 2
  // IntegrationService + AiClassifierService + TestimonialService.create
}
