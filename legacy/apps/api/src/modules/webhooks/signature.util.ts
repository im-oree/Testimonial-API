import { createHmac, timingSafeEqual } from 'crypto';

/**
 * HMAC-SHA256 webhook signature (README §17.3), modeled on Stripe:
 *   X-TestimonialAPI-Signature: t=<unix>,v1=<hex hmac>
 */
export function signPayload(payload: string | Buffer, secret: string, timestampSeconds: number): string {
  const hmac = createHmac('sha256', secret)
    .update(`${timestampSeconds}.${payload}`)
    .digest('hex');
  return `t=${timestampSeconds},v1=${hmac}`;
}

export function verifySignature(
  payload: string | Buffer,
  header: string | undefined,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const ts = Number(parts['t']);
  if (!Number.isInteger(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;
  const expected = signPayload(payload, secret, ts).split('v1=')[1];
  const given = parts['v1'];
  if (!given || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
