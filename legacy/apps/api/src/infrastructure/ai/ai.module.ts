import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { RoutingService } from './routing.service';
import { ConfidenceService } from './confidence.service';
import { PromptTemplateService } from './prompt-template.service';
import { AiGuardrailsService } from './guardrails.service';
import { AiCostTrackerService } from './cost-tracker.service';
import { AiReviewService } from './review.service';
import { AiOrchestratorService } from './orchestrator.service';
import { ProviderHealthJob } from './provider-health.job';
import { KmsDecryptorService } from './kms/kms-decryptor.service';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';

/**
 * AiModule — Doc 2 Additive A orchestration engine. Global module (imported
 * by InfrastructureModule) so feature engines (moderation/social import/
 * auto-tag) can inject AiOrchestratorService.executeTask as their ONLY AI
 * entry point.
 *
 * Bound under the global DatabaseModule scope: repo tokens (AI_PROVIDER,
 * AI_TASK_CONFIG, AI_REQUEST_LOG) + KMS token resolve from there.
 */
@Module({
  providers: [
    // Secret decryption (dev env fallback + GCP KMS path).
    { provide: REPOSITORY_TOKENS.KMS, useClass: KmsDecryptorService },
    ProviderRegistryService,
    RoutingService,
    ConfidenceService,
    PromptTemplateService,
    AiGuardrailsService,
    AiCostTrackerService,
    AiReviewService,
    AiOrchestratorService,
    ProviderHealthJob,
  ],
  exports: [
    AiOrchestratorService,
    AiCostTrackerService,
    AiReviewService,
    ConfidenceService,
    PromptTemplateService,
    AiGuardrailsService,
    ProviderRegistryService,
    RoutingService,
  ],
})
export class AiModule {}
