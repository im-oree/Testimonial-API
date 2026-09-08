import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';

/**
 * ProviderHealthJob — periodic (default every 2 minutes) circuit-breaker
 * recovery pass:
 *   1. refresh the registry (pick up admin edits / new providers)
 *   2. probe every provider whose failure counter > 0
 *   3. healthy ⇒ resetFailures (closes the circuit)
 *
 * Interval configurable via AI_HEALTH_CHECK_INTERVAL_MS (default 120000).
 * Disable for tests with AI_HEALTH_JOB_ENABLED=false — unit suites drive
 * `probe()` directly instead of waiting on timers.
 */
export const DEFAULT_HEALTH_INTERVAL_MS = 120_000;

@Injectable()
export class ProviderHealthJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderHealthJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly registry: ProviderRegistryService) {}

  onModuleInit(): void {
    if (process.env.AI_HEALTH_JOB_ENABLED === 'false') {
      this.logger.log('AI provider health job disabled (AI_HEALTH_JOB_ENABLED=false)');
      return;
    }
    const intervalMs = Number(process.env.AI_HEALTH_CHECK_INTERVAL_MS ?? DEFAULT_HEALTH_INTERVAL_MS);
    void this.runOnce(); // immediate first pass at boot
    this.timer = setInterval(() => void this.runOnce(), Number.isFinite(intervalMs) ? intervalMs : DEFAULT_HEALTH_INTERVAL_MS);
    this.timer.unref?.();
    this.logger.log(`AI provider health job scheduled every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** One pass: refresh + probe non-healthy providers. Returns count closed. */
  async runOnce(): Promise<number> {
    try {
      await this.registry.refresh();
    } catch (err) {
      this.logger.warn(`AI provider registry refresh failed (${err instanceof Error ? err.message : String(err)}) — retrying next pass`);
      return 0;
    }
    let closed = 0;
    for (const id of this.registry.listIds()) {
      const entry = this.registry.getUnsafe(id);
      if (!entry) continue;
      const unhealthy = entry.provider.consecutiveFailures > 0 || entry.provider.status === 'error';
      if (!unhealthy) continue;
      const ok = await this.registry.probe(id);
      if (ok) closed += 1;
    }
    if (closed > 0) this.logger.log(`AI provider health pass closed ${closed} circuit(s)`);
    return closed;
  }
}
