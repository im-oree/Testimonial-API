import { Inject, Injectable } from '@nestjs/common';
import {
  REPOSITORY_TOKENS,
  NoAvailableProviderError,
  type AiTaskConfig,
  type AiTaskType,
  type IAiProviderRepository,
  type RoutingStrategy,
} from '@testimonial-api/domain';
import { CIRCUIT_OPEN_AFTER, ProviderRegistryService } from './provider-registry.service';

/**
 * RoutingService — provider selection per ai_task_configs.routing_strategy.
 * All six strategies return an ORDERED list of provider ids; the orchestrator
 * attempts them in order (each entry = one failover hop).
 *
 *   round_robin   rotate across the config's provider pool (per task type)
 *   weighted      random by provider_weights (absent weight ⇒ 1) — the ±5%
 *                 distribution guarantee is asserted over ≥1000 draws in tests
 *   failover      primary pool ordered by registry priority, then is_fallback
 *                 providers (default)
 *   cheapest      ordered by per-token price (input+output rates)
 *   fastest       ordered by recent average success latency
 *   single        the one configured provider (must be exactly one)
 */
export interface RoutingContext {
  /** Recent avg success latency per provider id (fastest strategy). */
  avgLatencyMs?: Record<string, number>;
  /** Expected combined token count for cost ranking (cheapest). */
  expectedTokens?: Record<string, number>;
}

@Injectable()
export class RoutingService {
  private readonly roundRobinCursor = new Map<AiTaskType, number>();

  constructor(
    private readonly registry: ProviderRegistryService,
    @Inject(REPOSITORY_TOKENS.AI_PROVIDER) private readonly providerRepo: IAiProviderRepository,
  ) {}

  /** Rank the config's provider pool according to its strategy. */
  async order(config: AiTaskConfig, ctx: RoutingContext = {}): Promise<string[]> {
    const pool = this.registry.inRegistryOrder(config.providerIds);
    const available = pool.filter((id) => !this.registry.isCircuitOpen(id));
    if (available.length === 0) {
      throw new NoAvailableProviderError(config.taskType);
    }
    const providers = available
      .map((id) => this.registry.get(id)?.provider)
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    switch (config.routingStrategy) {
      case 'single': {
        // Exactly one provider configured (config validation ensures this).
        const first = providers[0];
        if (!first) throw new NoAvailableProviderError(config.taskType);
        return [first.id];
      }
      case 'round_robin': {
        const cursor = this.roundRobinCursor.get(config.taskType) ?? 0;
        const start = cursor % providers.length;
        this.roundRobinCursor.set(config.taskType, start + 1);
        return providers.slice(start).concat(providers.slice(0, start)).map((p) => p.id);
      }
      case 'weighted': {
        return this.weightedDraw(providers, config.providerWeights).map((p) => p.id);
      }
      case 'cheapest': {
        const sorted = [...providers].sort((a, b) => {
          const costA = Number(a.costPerInputToken) + Number(a.costPerOutputToken);
          const costB = Number(b.costPerInputToken) + Number(b.costPerOutputToken);
          if (costA !== costB) return costA - costB;
          return a.priority - b.priority;
        });
        return sorted.map((p) => p.id);
      }
      case 'fastest': {
        const lat = ctx.avgLatencyMs ?? (await this.latencies(available));
        const sorted = [...providers].sort((a, b) => {
          const la = lat[a.id] ?? Number.POSITIVE_INFINITY;
          const lb = lat[b.id] ?? Number.POSITIVE_INFINITY;
          if (la !== lb) return la - lb;
          return a.priority - b.priority;
        });
        return sorted.map((p) => p.id);
      }
      case 'failover':
      default: {
        // Primary = non-fallback sorted by priority asc, then fallbacks.
        const primary = [...providers].filter((p) => !p.isFallback).sort((a, b) => a.priority - b.priority);
        const fallbacks = [...providers].filter((p) => p.isFallback).sort((a, b) => a.priority - b.priority);
        return [...primary, ...fallbacks].map((p) => p.id);
      }
    }
  }

  /** Weighted random draw WITHOUT replacement (weights ∝ probability). */
  private weightedDraw(providers: Array<{ id: string; settings: Record<string, unknown> }>, weights: Record<string, number>): Array<{ id: string }> {
    const remaining = [...providers];
    const order: Array<{ id: string }> = [];
    while (remaining.length > 0) {
      const total = remaining.reduce((sum, p) => sum + this.weightOf(p.id, weights), 0);
      let roll = Math.random() * total;
      let picked = remaining[0];
      for (const candidate of remaining) {
        roll -= this.weightOf(candidate.id, weights);
        if (roll <= 0) {
          picked = candidate;
          break;
        }
      }
      order.push(picked);
      remaining.splice(remaining.indexOf(picked), 1);
    }
    return order;
  }

  private weightOf(id: string, weights: Record<string, number>): number {
    const w = Number(weights[id]);
    return Number.isFinite(w) && w > 0 ? w : 1;
  }

  private async latencies(ids: string[]): Promise<Record<string, number>> {
    return this.providerRepo.getRecentAvgLatency(ids, 100);
  }
}

/** Strategy registry used for config validation + docs. */
export const ROUTING_STRATEGIES: RoutingStrategy[] = ['round_robin', 'weighted', 'failover', 'cheapest', 'fastest', 'single'];

/** Used by the weighted ±5% distribution test to construct a fair config. */
export const WEIGHTED_TOLERANCE = 0.05;
export const WEIGHTED_SAMPLE_SIZE = 1000;
export const CIRCUIT_LIMIT = CIRCUIT_OPEN_AFTER;
