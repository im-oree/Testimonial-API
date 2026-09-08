import { Injectable } from '@nestjs/common';
import type { AiProvider } from '@testimonial-api/domain';

/**
 * AiCostTrackerService — exact per-call cost accounting + dashboard
 * aggregations (README §17.x "AI & costs").
 *
 * cost_usd = inputTokens × cost_per_input_token + outputTokens ×
 *            cost_per_output_token  (both rates stored per TOKEN)
 * Rounded to 6 decimals to match NUMERIC(10,6) — rounding applied once,
 * last, so unit tests can assert exact arithmetic.
 */
@Injectable()
export class AiCostTrackerService {
  roundCost(n: number): number {
    return Math.round(n * 1_000_000) / 1_000_000;
  }

  computeCostUsd(provider: Pick<AiProvider, 'costPerInputToken' | 'costPerOutputToken'>, inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * Number(provider.costPerInputToken);
    const outputCost = outputTokens * Number(provider.costPerOutputToken);
    return this.roundCost(inputCost + outputCost);
  }
}
