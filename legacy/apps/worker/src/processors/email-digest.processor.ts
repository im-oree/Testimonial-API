import type { WorkerJob } from '../types';

export interface EmailDigestPayload {
  tenantId: string;
  type: 'pending_summary' | 'quota_warning' | 'payment_failed';
}

/**
 * Digest/alert emails (README §24): pending testimonial digests, quota
 * 80%/100% warnings, payment failures. Implementation: Doc 2.
 */
export async function emailDigestProcessor(job: WorkerJob<EmailDigestPayload>): Promise<void> {
  void job; // Doc 2
}
