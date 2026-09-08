import { describe, expect, it } from 'vitest';
import { redactConnectionString } from '../../src/common/utils/secret-redaction.util';

/**
 * Doc 6 §1.5 — the connection string must never reach logs/error output.
 * redactConnectionString rewrites any postgres(ql)://user:pass@ DSN to
 * postgres(ql)://***@ so credentials can never be grepped out of a log line
 * even when a driver diagnostic embeds the full URL.
 */
describe('redactConnectionString (Doc 6 §1.5)', () => {
  it('redacts userinfo from a standard postgresql:// DSN', () => {
    expect(redactConnectionString('postgresql://alice:s3cret@db.internal:5432/testimonial_api')).toBe(
      'postgresql://***@db.internal:5432/testimonial_api',
    );
  });

  it('also handles the postgres:// scheme variant', () => {
    expect(redactConnectionString('postgres://root:pass@localhost:5432/db')).toBe(
      'postgres://***@localhost:5432/db',
    );
  });

  it('handles passwords containing special characters (@, :, %, /)', () => {
    const dsn = 'postgresql://bob:p%40ss:w0rd@host:5433/db';
    const out = redactConnectionString(dsn);
    expect(out).toBe('postgresql://***@host:5433/db');
    expect(out).not.toContain('p%40ss:w0rd');
  });

  it('redacts every DSN inside a longer diagnostic/log text', () => {
    const log =
      'PrismaClientInitializationError: error: connection refused postgresql://u:pw@one:5432/a ' +
      '… retried postgresql://u:pw@two:5432/b';
    const out = redactConnectionString(log);
    expect(out).not.toContain('u:pw@');
    expect(out).not.toMatch(/postgres(?:ql)?:\/\/[^@\s/]+:[^@\s/]*@/); // no userinfo survives
    expect(out).toContain('postgresql://***@one:5432/a');
    expect(out).toContain('postgresql://***@two:5432/b');
  });

  it('leaves credential-free text unchanged', () => {
    const plain = 'Unhandled error on GET /v1/health: connect ECONNREFUSED 127.0.0.1:5432';
    expect(redactConnectionString(plain)).toBe(plain);
    expect(redactConnectionString('no url here')).toBe('no url here');
  });
});
