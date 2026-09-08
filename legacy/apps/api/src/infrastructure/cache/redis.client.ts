import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis client — lazy: only connects when REDIS_URL is present.
 * Used for rate limiting, runtime config cache, realtime fan-out
 * (README §9/§12/§13). Redis is ephemeral by design (README §32).
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
  private readonly logger = new Logger(RedisClient.name);
  private _client: Redis | null = null;

  get client(): Redis | null {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    if (!this._client) {
      this._client = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this._client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    }
    return this._client;
  }

  get isConnected(): boolean {
    return Boolean(this._client?.status === 'ready');
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      this._client.disconnect();
      this._client = null;
    }
  }
}
