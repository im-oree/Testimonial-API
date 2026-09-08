import { describe, expect, it } from 'vitest';
import { ApiKeyPair, PermissionSet, Rating } from '../src';
import { DomainError } from '../src/errors/domain.error';

describe('Rating value object', () => {
  it('accepts star5 within 1..5', () => {
    expect(Rating.of('star5', 5).toStarScale()).toBe(5);
    expect(Rating.of('star5', 1).toStarScale()).toBe(1);
  });

  it('rejects star5 out of bounds', () => {
    expect(() => Rating.of('star5', 0)).toThrow(DomainError);
    expect(() => Rating.of('star5', 6)).toThrow(DomainError);
    expect(() => Rating.of('star5', 4.5)).toThrow(DomainError);
  });

  it('normalizes nps and thumbs to a 1..5 star scale', () => {
    expect(Rating.of('nps', 10).toStarScale()).toBe(5);
    expect(Rating.of('nps', 0).toStarScale()).toBe(1);
    expect(Rating.of('thumbs', 1).toStarScale()).toBe(5);
    expect(Rating.of('thumbs', -1).toStarScale()).toBe(1);
  });

  it('allows null only for ratingType none', () => {
    expect(Rating.of('none', null).toStarScale()).toBeNull();
    expect(() => Rating.of('star5', null)).toThrow(DomainError);
  });
});

describe('PermissionSet value object', () => {
  const editor = PermissionSet.of('tenant.testimonials.read', 'tenant.testimonials.write');

  it('matches exact and wildcard permissions', () => {
    expect(editor.has('tenant.testimonials.read')).toBe(true);
    expect(editor.has('tenant.testimonials.approve')).toBe(false);
    const wildcard = PermissionSet.of('tenant.*');
    expect(wildcard.has('tenant.testimonials.approve')).toBe(true);
    expect(PermissionSet.of('*').has('platform.tenants.delete')).toBe(true);
  });

  it('merges role defaults with explicit overrides', () => {
    const effective = PermissionSet.merge(['tenant.testimonials.read'], ['tenant.testimonials.approve']);
    expect(effective.has('tenant.testimonials.approve')).toBe(true);
  });

  it('hasAll / hasAny behave', () => {
    expect(editor.hasAll(['tenant.testimonials.read', 'tenant.testimonials.write'])).toBe(true);
    expect(editor.hasAll(['tenant.testimonials.read', 'tenant.testimonials.delete'])).toBe(false);
    expect(editor.hasAny(['tenant.testimonials.approve', 'tenant.testimonials.write'])).toBe(true);
  });
});

describe('ApiKeyPair value object', () => {
  it('parses pk/sk tokens with environment', () => {
    const parsed = ApiKeyPair.parse('pk_live_7c1e9b4a2f0d');
    expect(parsed.type).toBe('public');
    expect(parsed.environment).toBe('live');
    expect(parsed.prefix).toBe('pk_live_7c1e');
  });

  it('rejects malformed tokens', () => {
    expect(() => ApiKeyPair.parse('nope')).toThrow(DomainError);
    expect(() => ApiKeyPair.parse('pk_staging_abc')).toThrow(DomainError);
  });
});
