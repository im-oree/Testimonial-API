/**
 * Public surface of the AI engine. Feature modules import ONLY this barrel
 * (or inject AiOrchestratorService via DI). Adapter/KMS internals must not
 * be imported from outside infrastructure/ai — the repo-boundaries lint rule
 * `no-ai-adapter-outside-ai-infra` enforces that.
 */
export { AiModule } from './ai.module';
export { AiOrchestratorService, type AiTaskInput } from './orchestrator.service';
export { ProviderRegistryService, CIRCUIT_OPEN_AFTER } from './provider-registry.service';
export { RoutingService, ROUTING_STRATEGIES } from './routing.service';
export { ConfidenceService, CONFIDENCE_REJECT_FLOOR, CONFIDENCE_DEFAULTS, type ConfidenceDecision } from './confidence.service';
export { PromptTemplateService } from './prompt-template.service';
export { AiGuardrailsService, MAX_INPUT_CHARS } from './guardrails.service';
export { AiCostTrackerService } from './cost-tracker.service';
export { AiReviewService, OVERRIDE_RATE_DOWNWEIGHT } from './review.service';
export { ProviderHealthJob, DEFAULT_HEALTH_INTERVAL_MS } from './provider-health.job';
