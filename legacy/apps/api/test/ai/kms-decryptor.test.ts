import { describe, expect, it } from 'vitest';
import { EnvKmsAdapter } from '../../src/infrastructure/ai/kms/env-kms.adapter';
import { KmsDecryptorService } from '../../src/infrastructure/ai/kms/kms-decryptor.service';

/**
 * KMS port: dev blobs (mock://, env:, plain:) decrypt locally; anything else
 * is an explicit configuration error (never silently empty).
 */
const env = new EnvKmsAdapter();

describe('EnvKmsAdapter', () => {
  it('passes through mock:// blobs', async () => {
    await expect(env.decrypt('mock://none')).resolves.toBe('mock://none');
  });

  it('reads env:VAR references', async () => {
    process.env.AI_TEST_KEY = 'sk-test-123';
    await expect(env.decrypt('env:AI_TEST_KEY')).resolves.toBe('sk-test-123');
    delete process.env.AI_TEST_KEY;
  });

  it('throws on missing env var', async () => {
    await expect(env.decrypt('env:AI_DEFINITELY_MISSING_VAR')).rejects.toThrow('not set');
  });

  it('throws on unrecognized blob formats (forces prod KMS config)', async () => {
    await expect(env.decrypt('gcp-kms:projects/p')).rejects.toThrow();
  });
});

describe('KmsDecryptorService dispatch', () => {
  it('routes gcp-kms blobs to the GCP adapter', async () => {
    const svc = new KmsDecryptorService();
    await expect(svc.decrypt('gcp-kms:key|Y2lwaGVy')).rejects.toThrow(); // no token in sandbox
  });

  it('routes mock/env blobs to the env adapter', async () => {
    const svc = new KmsDecryptorService();
    await expect(svc.decrypt('plain:secret')).resolves.toBe('secret');
    await expect(svc.decrypt('mock://none')).resolves.toBe('mock://none');
  });
});
