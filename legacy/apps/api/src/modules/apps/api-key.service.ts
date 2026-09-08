import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApiKeyPair, REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ApiKey, ApiKeyEnvironment, IApiKeyRepository } from '@testimonial-api/domain';

/**
 * ApiKeyService — credential issuance/rotation for an App (README §8).
 *
 * Key format: {pk|sk}_{live|test}_{random} — see ApiKeyPair VO.
 * SECURITY NOTE: Doc 2 replaces sha256 with argon2id for secret keys
 * (README §27). Public keys are stored plain by design (public tokens);
 * secret plaintext is shown once at issuance and NEVER persisted.
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.API_KEY) private readonly keys: IApiKeyRepository,
  ) {}

  static hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex'); // argon2id in Doc 2
  }

  /** Issue a fresh public/secret pair for an app+environment. */
  async issue(appId: string, environment: ApiKeyEnvironment, type: 'public' | 'secret'): Promise<{
    row: ApiKey;
    /** Full plaintext token — shown exactly once. */
    plaintext: string;
  }> {
    const prefix = type === 'public' ? 'pk' : 'sk';
    const raw = `${prefix}_${environment}_${randomBytes(24).toString('base64url')}`;
    const pair = ApiKeyPair.parse(raw);
    const row = await this.keys.create({
      appId,
      type,
      environment,
      keyPrefix: pair.prefix,
      keyHash: type === 'secret' ? ApiKeyService.hashSecret(raw) : null,
      plainValue: type === 'public' ? raw : null,
      status: 'active',
    });
    return { row, plaintext: raw };
  }

  async rotateSecret(appId: string, environment: ApiKeyEnvironment): Promise<void> {
    const active = await this.keys.findActiveSecret(appId, environment);
    if (active) await this.keys.revoke(active.id);
  }
}
