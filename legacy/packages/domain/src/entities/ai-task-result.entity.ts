/**
 * AiTaskResult — the uniform return of AiOrchestratorService.executeTask.
 * Callers (moderation/social-import/auto-tag engines) act on `decision`,
 * never on raw scores: 'auto' → use metadata, 'human_review' → flag for a
 * human, 'reject' → discard. From cache results carry logId of nothing
 * (no DB row written for cache hits).
 */
export type AiDecision = 'auto' | 'human_review' | 'reject';

export interface AiTaskResult {
  parsed: Record<string, unknown>;
  confidenceScore: number;
  decision: AiDecision;
  providerUsed: string;
  modelUsed: string;
  costUsd: number;
  latencyMs: number;
  fromCache: boolean;
  /** ai_request_logs.id when a real call was made; null for cache hits. */
  logId: string | null;
}
