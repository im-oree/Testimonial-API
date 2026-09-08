import { describe, expect, it, beforeEach } from 'vitest';
import type { AiProvider, AiTaskConfig } from '@testimonial-api/domain';
import { NoAvailableProviderError } from '@testimonial-api/domain';
import { ProviderRegistryService } from '../../src/infrastructure/ai/provider-registry.service';
import { RoutingService } from '../../src/infrastructure/ai/routing.service';
import { FakeProviderRepo, FakeKms, makeProvider, makeTaskConfig } from './fakes';

/**
 * Dedicated unit tests per routing strategy (Doc 2 Additive A DoD):
 * round_robin, weighted (±5% over 1000 draws), failover, cheapest, fastest,
 * single. All against the in-memory registry — zero LLM calls.
 */

let providerRepo: FakeProviderRepo;
let registry: ProviderRegistryService;
let routing: RoutingService;

function build(providers: AiProvider[], config: Partial<AiTaskConfig> = {}): AiTaskConfig {
  const ids = providers.map((p) => p.id);
  providerRepo = new FakeProviderRepo();
  providerRepo.seed(...providers);
  registry = new ProviderRegistryService(providerRepo, new FakeKms());
  routing = new RoutingService(registry, providerRepo);
  return makeTaskConfig({ providerIds: ids, ...config });
}

beforeEach(async () => {
  providerRepo = new FakeProviderRepo();
  registry = new ProviderRegistryService(providerRepo, new FakeKms());
  routing = new RoutingService(registry, providerRepo);
});

describe('RoutingService.round_robin', () => {
  it('rotates across the pool deterministically per task type', async () => {
    const cfg = build([makeProvider({ id: 'p1' }), makeProvider({ id: 'p2' }), makeProvider({ id: 'p3' })], { routingStrategy: 'round_robin' });
    await registry.refresh();
    const first = await routing.order(cfg);
    const second = await routing.order(cfg);
    const third = await routing.order(cfg);
    expect(first).toEqual(['p1', 'p2', 'p3']);
    expect(second).toEqual(['p2', 'p3', 'p1']);
    expect(third).toEqual(['p3', 'p1', 'p2']);
  });
});

describe('RoutingService.weighted', () => {
  it('distributes within ±5% of expected weight over 1000 draws', async () => {
    const cfg = build(
      [
        makeProvider({ id: 'heavy', name: 'heavy' }),
        makeProvider({ id: 'light', name: 'light' }),
      ],
      {
        routingStrategy: 'weighted',
        providerWeights: { heavy: 3, light: 1 },
      },
    );
    await registry.refresh();
    let heavyPicks = 0;
    const DRAWS = 1000;
    for (let i = 0; i < DRAWS; i += 1) {
      const ordered = await routing.order(cfg);
      if (ordered[0] === 'heavy') heavyPicks += 1;
    }
    const rate = heavyPicks / DRAWS;
    expect(rate).toBeGreaterThan(0.75 - 0.05);
    expect(rate).toBeLessThan(0.75 + 0.05);
  });
});

describe('RoutingService.failover', () => {
  it('orders primaries by priority then fallbacks', async () => {
    const cfg = build(
      [
        makeProvider({ id: 'fb', priority: 1, isFallback: true }),
        makeProvider({ id: 'sec', priority: 5 }),
        makeProvider({ id: 'pri', priority: 1 }),
      ],
      { routingStrategy: 'failover' },
    );
    await registry.refresh();
    const ordered = await routing.order(cfg);
    expect(ordered).toEqual(['pri', 'sec', 'fb']);
  });
});

describe('RoutingService.cheapest', () => {
  it('prefers the lowest per-token price', async () => {
    const cfg = build(
      [
        makeProvider({ id: 'pricey', costPerInputToken: 0.00002, costPerOutputToken: 0.00006 }),
        makeProvider({ id: 'cheap', costPerInputToken: 0.000001, costPerOutputToken: 0.000002 }),
      ],
      { routingStrategy: 'cheapest' },
    );
    await registry.refresh();
    const ordered = await routing.order(cfg);
    expect(ordered[0]).toBe('cheap');
    expect(ordered[1]).toBe('pricey');
  });
});

describe('RoutingService.fastest', () => {
  it('prefers the lowest recent average latency', async () => {
    const cfg = build(
      [
        makeProvider({ id: 'slow', priority: 1 }),
        makeProvider({ id: 'quick', priority: 2 }),
      ],
      { routingStrategy: 'fastest' },
    );
    await registry.refresh();
    const ordered = await routing.order(cfg, { avgLatencyMs: { slow: 400, quick: 80 } });
    expect(ordered[0]).toBe('quick');
    expect(ordered[1]).toBe('slow');
  });
});

describe('RoutingService.single', () => {
  it('returns the single configured provider', async () => {
    const cfg = build([makeProvider({ id: 'only' })], { routingStrategy: 'single' });
    await registry.refresh();
    expect(await routing.order(cfg)).toEqual(['only']);
  });

  it('throws NoAvailableProviderError when the provider circuit is open', async () => {
    const cfg = build([makeProvider({ id: 'down', consecutiveFailures: 4, status: 'error' })], {
      routingStrategy: 'single',
    });
    await registry.refresh();
    await expect(routing.order(cfg)).rejects.toBeInstanceOf(NoAvailableProviderError);
  });
});
