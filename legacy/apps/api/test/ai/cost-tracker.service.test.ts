import { describe, expect, it } from 'vitest';
import { AiCostTrackerService } from '../../src/infrastructure/ai/cost-tracker.service';

/**
 * Cost math must be EXACT: cost = input×rate_in + output×rate_out, single
 * rounding at 6dp (NUMERIC(10,6) column).
 */
const service = new AiCostTrackerService();

describe('AiCostTrackerService.computeCostUsd', () => {
  it('computes exact input+output cost', () => {
    const provider = { costPerInputToken: 0.000002, costPerOutputToken: 0.00001 };
    expect(service.computeCostUsd(provider, 1000, 500)).toBe(0.007);
  });

  it('matches cost-tracking expectations for seeded mock rates (zero cost)', () => {
    const provider = { costPerInputToken: 0, costPerOutputToken: 0 };
    expect(service.computeCostUsd(provider, 9000, 2000)).toBe(0);
  });

  it('rounds to 6 decimal places once', () => {
    const provider = { costPerInputToken: 0.0000001, costPerOutputToken: 0.0000003 };
    // 12345 * 1e-7 = 0.0012345 (exact); + 3333*3e-7 = 0.0009999 ⇒ 0.0022344
    expect(service.computeCostUsd(provider, 12345, 3333)).toBeCloseTo(0.0022344, 6);
  });
});
