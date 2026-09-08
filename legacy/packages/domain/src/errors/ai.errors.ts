// ============================================================
// AI-engine error catalogue. These are engine-level errors (not
// HTTP-mapped DomainErrors): the AI layer is called by business
// engines/services which decide how to surface them. Each carries
// a stable `code` for logging/alerting/tests.
// ============================================================

import type { AiTaskType } from '../entities/ai-task-config.entity';

export class AiProviderError extends Error {
  readonly code = 'AI_PROVIDER_ERROR';
  readonly statusCode?: number;
  constructor(message: string, opts?: { statusCode?: number; cause?: unknown }) {
    super(message);
    this.name = 'AiProviderError';
    this.statusCode = opts?.statusCode;
    if (opts?.cause) this.cause = opts.cause;
  }
}

export class NoAvailableProviderError extends Error {
  readonly code = 'AI_NO_AVAILABLE_PROVIDER';
  constructor(taskOrMessage: AiTaskType | string) {
    super(typeof taskOrMessage === 'string' && !taskOrMessage.includes(' ') ? `No available AI provider for task "${taskOrMessage}"` : taskOrMessage);
    this.name = 'NoAvailableProviderError';
  }
}

export class AiTaskNotConfiguredError extends Error {
  readonly code = 'AI_TASK_NOT_CONFIGURED';
  constructor(taskType: AiTaskType) {
    super(`No active AI task config for task type "${taskType}"`);
    this.name = 'AiTaskNotConfiguredError';
  }
}

export class AiExecutionError extends Error {
  readonly code = 'AI_EXECUTION_FAILED';
  readonly lastError?: Error;
  constructor(message: string, lastError?: Error) {
    super(message);
    this.name = 'AiExecutionError';
    this.lastError = lastError;
  }
}

export class AiInputRejectedError extends Error {
  readonly code = 'AI_INPUT_REJECTED';
  readonly reason: string;
  constructor(reason: string) {
    super(`AI input rejected by guardrails: ${reason}`);
    this.name = 'AiInputRejectedError';
    this.reason = reason;
  }
}
