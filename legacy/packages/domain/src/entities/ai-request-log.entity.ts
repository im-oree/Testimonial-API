export type AiRequestStatus =
  | 'success'
  | 'error'
  | 'timeout'
  | 'rate_limited'
  | 'low_confidence'
  | 'human_override';

/**
 * AiRequestLog — one row per AI call (success AND failure). Full audit:
 * rendered prompt, tokens, cost, latency, confidence, and the human-review
 * feedback loop (humanOverride/qualityRating). Partitioned monthly in SQL.
 */
export interface AiRequestLog {
  id: string;
  taskConfigId: string;
  providerId: string;
  model: string;
  /** Full rendered prompt (debugging + audit). */
  prompt: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  rawResponse: string | null;
  parsedResponse: Record<string, unknown> | null;
  confidenceScore: number | null;
  status: AiRequestStatus;
  errorMessage: string | null;
  humanOverride: boolean;
  humanOverrideValue: string | null;
  /** 1–5, optionally filled later by a human reviewer. */
  qualityRating: number | null;
  tenantId: string | null;
  appId: string | null;
  createdAt: Date;
}

export type CreateAiRequestLog = Omit<AiRequestLog, 'id' | 'createdAt' | 'humanOverride' | 'humanOverrideValue' | 'qualityRating'>;

/** Aggregations returned by the request-log repository (dashboard + cost page). */
export interface AiCostSummary {
  totalCostUsd: number;
  byProvider: Record<string, number>;
  byTask: Record<string, number>;
  byDay: Record<string, number>;
}

export interface AiQualityReport {
  avgQualityRating: number;
  humanOverrideRate: number; // 0..1
  avgConfidence: number;
  totalRequests: number;
}
