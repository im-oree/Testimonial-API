/**
 * Doc 6 §1.3 — full-text search input sanitizer.
 *
 * Search strings reach Prisma as `contains` filters, which translate to a
 * parameterized (ILIKE) query. The value is still interpolated into a LIKE
 * pattern, so unescaped `%`, `_` and `\` act as wildcards/escape and let a
 * caller widen the match beyond intent (search-shape injection). SQL-significant
 * characters (`< > ' " ;`) are stripped as defense-in-depth so a payload can
 * never form a second statement even if it ever lands on a raw path, and the
 * value is hard-capped at 200 chars.
 *
 * Order of operations (verbatim from Doc 6 §1.3): escape LIKE wildcards →
 * strip SQL-significant characters → hard length cap.
 *
 * NOTE: this is search *input* hygiene only. Stored content (testimonials,
 * author names, tags) is intentionally NEVER escaped/stripped on the write
 * path — a user may legitimately write `100% done` or `it's fine`, and Prisma
 * parameterizes all values so stored text cannot execute. Apply this function
 * only where a value is about to become a `contains` filter.
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[%_\\]/g, '\\$&') // escape LIKE wildcards (%, _) and the escape char itself
    .replace(/[<>'";]/g, '') // strip SQL-significant characters
    .slice(0, 200); // hard length cap
}
