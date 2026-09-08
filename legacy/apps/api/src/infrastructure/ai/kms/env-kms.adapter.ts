import type { IKmsDecryptor } from '@testimonial-api/domain';

/**
 * Dev/environment KMS adapter — the DEFAULT implementation used in the
 * sandbox, emulators and CI (no external KMS reachable). Blob grammar:
 *
 *   mock://anything        → passthrough (MockAdapter needs no secret)
 *   env:VAR_NAME           → process.env[VAR_NAME]
 *   plain:value            → explicit dev plaintext (never used in prod)
 *   anything-else          → throw: prod blobs must go through GcpKmsAdapter
 */
export class EnvKmsAdapter implements IKmsDecryptor {
  async decrypt(blob: string): Promise<string> {
    if (blob.startsWith('mock://')) return blob;
    if (blob.startsWith('plain:')) return blob.slice('plain:'.length);
    if (blob.startsWith('env:')) {
      const name = blob.slice('env:'.length);
      const value = process.env[name];
      if (!value) throw new Error(`KMS env fallback: env var "${name}" is not set`);
      return value;
    }
    throw new Error(
      'KMS blob not decryptable by env adapter (expected mock://, env: or plain:) — configure GcpKmsAdapter in production',
    );
  }
}
