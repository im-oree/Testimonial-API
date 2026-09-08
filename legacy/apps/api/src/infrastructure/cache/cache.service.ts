import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { RedisClient } from './redis.client';

/** Cache surface used by services — Redis when configured, in-memory fallback in dev. */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
}

@Injectable()
export class CacheServiceImpl implements CacheService {
  private readonly logger = new Logger(CacheServiceImpl.name);
  private readonly memory = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(@Optional() @Inject(RedisClient) private readonly redis?: RedisClient) {}

  private get isRedisReady(): boolean {
    return Boolean(this.redis && this.redis.isConnected);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisReady) {
      const raw = await this.redis!.client!.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const hit = this.memory.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (this.isRedisReady) {
      await this.redis!.client!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    }
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisReady) {
      await this.redis!.client!.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isRedisReady) {
      const n = await this.redis!.client!.incr(key);
      if (ttlSeconds) await this.redis!.client!.expire(key, ttlSeconds);
      return n;
    }
    const hit = this.memory.get(key);
    const next = (typeof hit?.value === 'number' ? hit.value : 0) + 1;
    this.memory.set(key, { value: next, expiresAt: Date.now() + (ttlSeconds ?? 60) * 1000 });
    return next;
  }
}
