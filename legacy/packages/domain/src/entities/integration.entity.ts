export type IntegrationProvider =
  | 'twitter'
  | 'google_reviews'
  | 'producthunt'
  | 'slack'
  | 'zapier'
  | 'webhook';
export type IntegrationStatus = 'connected' | 'error' | 'disabled';

export interface Integration {
  id: string;
  appId: string;
  provider: IntegrationProvider;
  /** KMS envelope-encrypted blob (never plaintext at rest — README §27). */
  credentialsEncrypted: string | null;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export type CreateIntegration = Omit<Integration, 'id' | 'createdAt' | 'lastSyncAt' | 'lastError'>;
