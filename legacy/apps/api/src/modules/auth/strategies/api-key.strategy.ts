/**
 * API-key strategy — machine credentials (README §8). Full verification
 * pipeline (lookup by hash/plain value → Redis cache → origin for pk →
 * rate-limit bucket → quota check → AuthContext) ships in Doc 2.
 */
export class ApiKeyStrategy {
  // verify(rawToken: string): Promise<AuthContext> — Doc 2
}
