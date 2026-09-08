export type AiTaskType =
  | 'classify_testimonial'
  | 'summarize'
  | 'translate'
  | 'extract_sentiment'
  | 'detect_spam'
  | 'generate_reply'
  | 'custom';

export type RoutingStrategy = 'round_robin' | 'weighted' | 'failover' | 'cheapest' | 'fastest' | 'single';

/**
 * AiTaskConfig — per-task orchestration policy. Which providers may serve
 * this task, how they are selected, how confident the AI must be, and
 * whether an "auto" decision is even allowed (classify_testimonial ships
 * with autoApproveThreshold = null: never auto-publish social imports).
 */
export interface AiTaskConfig {
  id: string;
  taskType: AiTaskType;
  name: string;
  /** Handlebars-style template: "Classify this post about {{brandName}}: {{text}}" */
  promptTemplate: string;
  /** JSON Schema-ish shape description for structured-output enforcement. */
  responseSchema: Record<string, unknown> | null;
  routingStrategy: RoutingStrategy;
  /** Ordered for failover; pool for round-robin/weighted. */
  providerIds: string[];
  /** Weighted strategy: { providerId: weight }. */
  providerWeights: Record<string, number>;
  /** 0.0–1.0; below this → human review. */
  confidenceThreshold: number;
  /** Above this → 'auto'. null = never auto (always human) for this task. */
  autoApproveThreshold: number | null;
  maxRetries: number;
  timeoutMs: number;
  /** Cache identical prompt+input combos; 0 disables. */
  cacheTtlSeconds: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateAiTaskConfig = Omit<AiTaskConfig, 'id' | 'createdAt' | 'updatedAt'>;
