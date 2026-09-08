import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AiExecutionError,
  AiProviderError,
  AiTaskNotConfiguredError,
  REPOSITORY_TOKENS,
  type AiProvider,
  type AiTaskConfig,
  type AiTaskResult,
  type AiTaskType,
  type IAiRequestLogRepository,
  type IAiTaskConfigRepository,
} from '@testimonial-api/domain';
import { ProviderRegistryService } from './provider-registry.service';
import { RoutingService } from './routing.service';
import { ConfidenceService } from './confidence.service';
import { PromptTemplateService } from './prompt-template.service';
import { AiGuardrailsService } from './guardrails.service';
import { AiCostTrackerService } from './cost-tracker.service';
import { coerceJson, parseLlmJson } from './utils';

/**
 * AiOrchestratorService — THE ONLY AI entry point for business engines
 * (Twitter/social-import, moderation, auto-tagging, …). Nothing outside
 * infrastructure/ai may call a provider adapter directly (boundary rule
 * `repo-boundaries/no-ai-adapter-outside-ai-infra`).
 *
 * Pipeline per executeTask:
 *   guardrails.validateInput → load task config → render prompt →
 *   cache lookup (hit ⇒ fromCache, NO new log row) → route → attempt(s)
 *   with failover/retries → guardrails.validateOutput → parse →
 *   confidence.decide → persist one ai_request_log row PER ATTEMPT
 *   (every success AND failure) → AiTaskResult.
 *
 * Exhausted retries ⇒ AiExecutionError (never a silent partial success).
 */
export interface AiTaskInput {
  taskType: AiTaskType;
  /** Rendered template variables (text/brandName/authorName/…). */
  vars: Record<string, string | number | boolean | null | undefined>;
  tenantId?: string | null;
  appId?: string | null;
}

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly routing: RoutingService,
    private readonly confidence: ConfidenceService,
    private readonly templates: PromptTemplateService,
    private readonly guardrails: AiGuardrailsService,
    private readonly cost: AiCostTrackerService,
    @Inject(REPOSITORY_TOKENS.AI_TASK_CONFIG) private readonly configs: IAiTaskConfigRepository,
    @Inject(REPOSITORY_TOKENS.AI_REQUEST_LOG) private readonly logs: IAiRequestLogRepository,
  ) {}

  /** Ensure the registry has been loaded at least once (safe to call twice). */
  async warmup(): Promise<void> {
    if (this.registry.size === 0) await this.registry.refresh();
  }

  async executeTask(input: AiTaskInput): Promise<AiTaskResult> {
    await this.warmup();

    // 1) Pre-LLM guardrails on the primary text variable (throws before any call).
    const rawText = input.vars.text === undefined || input.vars.text === null ? '' : String(input.vars.text);
    const gated = this.guardrails.validateInput(rawText);
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.vars)) {
      if (v === undefined || v === null) continue;
      const asString = String(v);
      vars[k] = k === 'text' && gated.piiRedacted > 0 ? this.guardrails.redactPii(asString).text : asString;
    }

    // 2) Task config + rendered prompt.
    const config = await this.configs.findByTaskType(input.taskType);
    if (!config || !config.isActive) throw new AiTaskNotConfiguredError(input.taskType);
    const prompt = this.templates.render(config.promptTemplate, vars);

    // 3) Cache lookup — fromCache hits write NO new log row.
    if (config.cacheTtlSeconds > 0) {
      const since = new Date(Date.now() - config.cacheTtlSeconds * 1000);
      const cached = await this.logs.findRecentSuccess(config.id, prompt, since);
      if (cached && cached.parsedResponse) {
        const decided = this.confidence.decide(cached.parsedResponse, config);
        return {
          parsed: cached.parsedResponse,
          confidenceScore: decided.confidence,
          decision: decided.decision,
          providerUsed: cached.providerId,
          modelUsed: cached.model,
          costUsd: cached.costUsd,
          latencyMs: cached.latencyMs,
          fromCache: true,
          logId: null,
        };
      }
    }

    // 4) Route + attempt with failover/retries. Each attempt is one log row.
    const ordered = await this.routing.order(config);
    // Retry budget: max_retries retries on top of the first attempt, rotating
    // through the routed pool (one provider each) when retrying.
    const maxAttempts = config.maxRetries + 1;
    let lastError: Error | undefined;
    for (let i = 0; i < maxAttempts; i += 1) {
      const attempt = await this.attemptOnce(config, prompt, ordered[i % ordered.length], input);
      if (attempt.ok) return attempt.result as AiTaskResult;
      lastError = attempt.error;
    }

    throw new AiExecutionError(
      `AI task "${input.taskType}" failed after ${maxAttempts} attempt(s) — no provider succeeded`,
      lastError,
    );
  }

  private async attemptOnce(
    config: AiTaskConfig,
    prompt: string,
    providerId: string,
    input: AiTaskInput,
  ): Promise<{ ok: boolean; result?: AiTaskResult; error?: Error }> {
    const registered = this.registry.get(providerId);
    if (!registered) return { ok: false, error: new AiProviderError(`provider ${providerId} unavailable`) };
    const { provider, apiKey, adapter } = registered;

    const request = this.buildRequest(config, prompt, provider);
    const started = Date.now();
    try {
      const response = await adapter.complete(request, apiKey, provider.baseUrl ?? undefined);
      const latencyMs = Math.max(1, Date.now() - started);

      // Post-LLM guardrails, then parse.
      const { sanitized, flags } = this.guardrails.validateOutput(response.content);
      const parsed = this.parse(config, sanitized);
      const decided = this.confidence.decide(parsed, config);
      const costUsd = this.cost.computeCostUsd(provider, response.inputTokens, response.outputTokens);

      const row = await this.logs.create({
        taskConfigId: config.id,
        providerId: provider.id,
        model: response.model,
        prompt,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd,
        latencyMs,
        rawResponse: response.content,
        parsedResponse: parsed,
        confidenceScore: decided.confidence,
        status: 'success',
        errorMessage: flags.length > 0 ? `output flags: ${flags.join(',')}` : null,
        tenantId: input.tenantId ?? null,
        appId: input.appId ?? null,
      });
      await this.registry.recordSuccess(provider.id);

      return {
        ok: true,
        result: {
          parsed,
          confidenceScore: decided.confidence,
          decision: decided.decision,
          providerUsed: provider.id,
          modelUsed: response.model,
          costUsd,
          latencyMs,
          fromCache: false,
          logId: row.id,
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const latencyMs = Math.max(1, Date.now() - started);
      const status = this.statusOf(err);
      const message = this.messageOf(err);
      await this.logs.create({
        taskConfigId: config.id,
        providerId: provider.id,
        model: provider.defaultModel,
        prompt,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        latencyMs,
        rawResponse: null,
        parsedResponse: null,
        confidenceScore: null,
        status,
        errorMessage: message,
        tenantId: input.tenantId ?? null,
        appId: input.appId ?? null,
      });
      await this.registry.recordFailure(provider.id, message);
      this.logger.warn(`AI attempt failed (${provider.name}): ${message}`);
      return { ok: false, error };
    }
  }

  private buildRequest(config: AiTaskConfig, prompt: string, provider: AiProvider) {
    const settings = (provider.settings ?? {}) as Record<string, unknown>;
    const temperature = Number(settings.temperature ?? 0.2);
    return {
      model: provider.defaultModel,
      prompt,
      systemPrompt: 'You are a precise assistant. Follow the schema in the user prompt exactly.',
      maxTokens: provider.maxTokensPerRequest,
      temperature: Number.isFinite(temperature) ? temperature : 0.2,
      timeoutMs: config.timeoutMs,
      responseFormat: config.responseSchema ? ('json' as const) : ('text' as const),
      responseSchema: config.responseSchema ?? undefined,
    };
  }

  private parse(config: AiTaskConfig, sanitized: string): Record<string, unknown> {
    if (config.responseSchema) return parseLlmJson<Record<string, unknown>>(sanitized);
    const maybeJson = coerceJson<Record<string, unknown>>(sanitized);
    if (maybeJson) return maybeJson;
    // Free-text tasks (translate/reply): wrap in a content key the caller
    // engines read uniformly.
    return { text: sanitized };
  }

  private statusOf(err: unknown): 'error' | 'timeout' | 'rate_limited' {
    if (err instanceof AiProviderError) {
      if (err.statusCode === 408) return 'timeout';
      if (err.statusCode === 429) return 'rate_limited';
    }
    return 'error';
  }

  private messageOf(err: unknown): string {
    if (err instanceof Error) return err.message.slice(0, 2000);
    return String(err).slice(0, 2000);
  }
}
