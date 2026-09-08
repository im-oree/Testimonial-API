import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REPOSITORY_TOKENS,
  type AiProvider,
  type IAiProviderAdapter,
  type IAiProviderRepository,
  type IKmsDecryptor,
} from '@testimonial-api/domain';
import { createAdapter } from './adapters';

/**
 * ProviderRegistryService — in-memory registry of active AI providers.
 *
 * Loaded from IAiProviderRepository, decrypted through the KMS port and
 * bound to the right IAiProviderAdapter. Holds per-provider circuit state
 * (consecutiveFailures > CIRCUIT_OPEN_AFTER ⇒ excluded from routing until
 * the health job probes it back to life).
 *
 * Routing/execution never touches the repository or KMS per call — only
 * refresh() (startup + 2-min health job) reloads state.
 */
export const CIRCUIT_OPEN_AFTER = 3;
export const CIRCUIT_CLOSED_AFTER_SUCCESS = 1;

export interface RegisteredProvider {
  provider: AiProvider;
  apiKey: string;
  adapter: IAiProviderAdapter;
}

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private byId = new Map<string, RegisteredProvider>();
  private order: string[] = [];
  private _lastRefreshAt = 0;

  constructor(
    @Inject(REPOSITORY_TOKENS.AI_PROVIDER) private readonly providers: IAiProviderRepository,
    @Inject(REPOSITORY_TOKENS.KMS) private readonly kms: IKmsDecryptor,
  ) {}

  get lastRefreshAt(): number {
    return this._lastRefreshAt;
  }

  /** Reload active providers, decrypt keys, build adapters. */
  async refresh(): Promise<void> {
    const active = await this.providers.listActive();
    const next = new Map<string, RegisteredProvider>();
    for (const provider of active) {
      try {
        const apiKey = await this.kms.decrypt(provider.apiKeyEncrypted);
        const adapter = createAdapter(provider.type);
        next.set(provider.id, { provider, apiKey, adapter });
      } catch (err) {
        this.logger.warn(`AI provider ${provider.name} (${provider.id}) skipped: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.byId = next;
    this.order = active.map((p) => p.id);
    this._lastRefreshAt = Date.now();
    this.logger.log(`AI provider registry refreshed: ${this.order.length} active provider(s)`);
  }

  get size(): number {
    return this.byId.size;
  }

  listIds(): string[] {
    return [...this.order];
  }

  get(id: string): RegisteredProvider | null {
    const entry = this.byId.get(id);
    if (!entry) return null;
    if (this.isCircuitOpen(id)) return null;
    return entry;
  }

  /** Raw lookup ignoring circuit state (health job uses this). */
  getUnsafe(id: string): RegisteredProvider | null {
    return this.byId.get(id) ?? null;
  }

  /** Circuit rule: consecutiveFailures > 3 ⇒ provider excluded from routing. */
  isCircuitOpen(id: string): boolean {
    const entry = this.byId.get(id);
    return entry ? entry.provider.consecutiveFailures > CIRCUIT_OPEN_AFTER : true;
  }

  /** Order a set of ids by registry order (stable, deduped). */
  inRegistryOrder(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of this.order) {
      if (ids.includes(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  /**
   * Record a failure for a provider. Persists the counter and updates the
   * local registry copy so the circuit opens immediately for subsequent calls.
   */
  async recordFailure(id: string, message?: string): Promise<void> {
    const entry = this.byId.get(id);
    if (!entry) return;
    await this.providers.incrementFailures(id, message);
    entry.provider = {
      ...entry.provider,
      consecutiveFailures: entry.provider.consecutiveFailures + 1,
      lastError: message ?? entry.provider.lastError,
      lastErrorAt: new Date(),
    };
    if (entry.provider.consecutiveFailures > CIRCUIT_OPEN_AFTER) {
      this.logger.warn(`AI provider ${entry.provider.name} circuit OPEN (${entry.provider.consecutiveFailures} consecutive failures)`);
    }
  }

  /** Record a success — closes the circuit when back below the threshold. */
  async recordSuccess(id: string): Promise<void> {
    const entry = this.byId.get(id);
    if (!entry) return;
    if (entry.provider.consecutiveFailures > 0) {
      await this.providers.resetFailures(id);
      entry.provider = { ...entry.provider, consecutiveFailures: 0, lastError: null, lastErrorAt: null };
    }
  }

  /** Verify a provider is responsive again (health job). Returns open/closed. */
  async probe(id: string): Promise<boolean> {
    const entry = this.byId.get(id);
    if (!entry) return false;
    try {
      const healthy = await entry.adapter.isHealthy(entry.apiKey, entry.provider.baseUrl ?? undefined);
      if (healthy) {
        await this.providers.resetFailures(id);
        entry.provider = { ...entry.provider, consecutiveFailures: 0, status: 'active', lastError: null };
        this.logger.log(`AI provider ${entry.provider.name} recovered (health probe)`);
      } else {
        this.logger.warn(`AI provider ${entry.provider.name} still unhealthy (health probe)`);
      }
      return healthy;
    } catch (err) {
      this.logger.warn(`AI provider probe ${entry.provider.name} errored: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
