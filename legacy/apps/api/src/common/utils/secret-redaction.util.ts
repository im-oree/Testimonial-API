/**
 * Doc 6 §1.5 — connection-string hygiene.
 *
 * DATABASE_URL (and any postgres:// credential URL) must never appear in
 * logs, error messages, or outbound telemetry. When an error is rendered for
 * a log line, run the text through `redactConnectionString` first so a
 * Prisma/pg diagnostic that embeds the DSN cannot leak the credentials.
 *
 * Regex (verbatim from Doc 6 §1.5): `postgresql://[^@]+@` → `postgresql://***@`
 * (the `postgres://` scheme variant is handled too — same credential grammar).
 */
const CONNECTION_STRING_PATTERN = /(postgres(?:ql)?:\/\/)[^@\s/]+@/gi;

export function redactConnectionString(text: string): string {
  return text.replace(CONNECTION_STRING_PATTERN, '$1***@');
}
