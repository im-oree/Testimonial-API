import { describe, expect, it } from 'vitest';
import { generatePublicId, generateToken, randomAlphanumeric, uuidV4 } from '../src/utils/id-generator';

describe('id-generator', () => {
  it('generates prefixed public ids of the documented shape', () => {
    const id = generatePublicId('app');
    expect(id).toMatch(/^app_[0-9a-z]{12}$/);

    const key = generatePublicId('pk_live');
    expect(key).toMatch(/^pk_live_[0-9a-z]{12}$/);
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generatePublicId('app')));
    expect(ids.size).toBe(1000);
  });

  it('returns UUID v4 and url-safe tokens', () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('randomAlphanumeric stays in alphabet', () => {
    expect(randomAlphanumeric(20)).toMatch(/^[0-9a-z]{20}$/);
  });
});
