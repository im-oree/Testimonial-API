/**
 * AI engine shared utilities (no Nest dependencies — pure + unit-testable).
 */

/** Rough token estimate when a provider omits usage (chars ≈ tokens * 4). */
export function estimateTokens(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

/**
 * Parse a model's content into a JSON object. Models occasionally wrap JSON
 * in ```json fences or add leading prose — strip fences, then locate the
 * outermost {…} block. Throws on unparseable output.
 */
export function parseLlmJson<T extends Record<string, unknown>>(content: string): T {
  let cleaned = content.trim();
  // Strip markdown code fences.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Model output is not JSON: ${content.slice(0, 120)}`);
  }
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new Error(`Model output contains invalid JSON: ${content.slice(0, 120)}`);
  }
}

/** Strip an outer JSON block out of a message that may carry prose (mock/text tasks). */
export function coerceJson<T extends Record<string, unknown>>(content: string): T | null {
  try {
    return parseLlmJson<T>(content);
  } catch {
    return null;
  }
}
