/**
 * Session JWT strategy — validates the dashboard session cookie / bearer
 * JWT issued at login (README §7.2-7.3). permVersion staleness check vs
 * Redis lives in Doc 2 (README §10.6). Structure reserved here.
 */
export class JwtStrategy {
  // validate(sessionToken): Promise<SessionPayload> — Doc 2
}
