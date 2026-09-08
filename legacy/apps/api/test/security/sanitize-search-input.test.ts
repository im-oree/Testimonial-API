import { describe, expect, it } from 'vitest';
import { sanitizeSearchInput } from '../../src/common/utils/sanitize-search-input';

/**
 * Doc 6 §1.3 — search sanitizer unit tests. The sanitizer is the last
 * defense before a value becomes a Prisma `contains` (ILIKE) filter:
 * LIKE wildcards (% _ \) are escaped, SQL-significant chars (< > ' " ;) are
 * stripped, and the result is hard-capped at 200 chars — in that order.
 */
describe('sanitizeSearchInput (Doc 6 §1.3)', () => {
  it('escapes LIKE wildcards: % _ and the escape char itself', () => {
    expect(sanitizeSearchInput('100% done')).toBe('100\\% done');
    expect(sanitizeSearchInput('under_score')).toBe('under\\_score');
    expect(sanitizeSearchInput('back\\slash')).toBe('back\\\\slash');
    expect(sanitizeSearchInput('%')).toBe('\\%');
    expect(sanitizeSearchInput('_')).toBe('\\_');
  });

  it('strips SQL-significant characters < > \' " ;', () => {
    expect(sanitizeSearchInput("' OR '1'='1")).toBe(' OR 1=1');
    expect(sanitizeSearchInput('a; DROP TABLE x; --')).toBe('a DROP TABLE x --');
    expect(sanitizeSearchInput('<script>"x"</script>')).toBe('scriptx/script');
    expect(sanitizeSearchInput("can't")).toBe('cant');
  });

  it('hard-caps the result at 200 characters', () => {
    expect(sanitizeSearchInput('a'.repeat(500))).toHaveLength(200);
    expect(sanitizeSearchInput('a'.repeat(199))).toHaveLength(199);
    expect(sanitizeSearchInput('a'.repeat(200))).toHaveLength(200);
  });

  it('leaves innocuous search text untouched', () => {
    expect(sanitizeSearchInput('great service 2026')).toBe('great service 2026');
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('escapes/strips in the documented order (escape → strip → cap)', () => {
    // A quote-strip cannot re-introduce an unescaped wildcard, and the cap
    // applies to the post-strip value, not the raw input.
    const long = `${'x'.repeat(50)}'${'y'.repeat(300)}`;
    const out = sanitizeSearchInput(long);
    expect(out).toHaveLength(200);
    expect(out.startsWith('x'.repeat(50))).toBe(true);
  });

  it('search output can never contain an unescaped % or _ wildcard or SQL char', () => {
    for (const probe of ['a%b', 'a_b', 'a\\b', "a'b", 'a;b', 'a"b', 'a<b', 'a>b']) {
      const out = sanitizeSearchInput(probe);
      // % and _ only ever appear immediately preceded by a backslash escape.
      expect(out).not.toMatch(/(?<!\\)[%_]/);
      expect(out).not.toMatch(/[<>'";]/);
    }
  });
});
