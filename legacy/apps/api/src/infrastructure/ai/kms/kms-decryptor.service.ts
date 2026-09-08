import { Injectable } from '@nestjs/common';
import type { IKmsDecryptor } from '@testimonial-api/domain';
import { EnvKmsAdapter } from './env-kms.adapter';
import { GcpKmsAdapter } from './gcp-kms.adapter';

/**
 * KmsDecryptorService — prefix-dispatching IKmsDecryptor.
 *   mock://  → passthrough          (mock adapter)
 *   env:VAR  → process.env fallback (dev/emulator/CI)
 *   plain:…  → explicit dev plaintext
 *   gcp-kms: → GcpKmsAdapter (production)
 *
 * Registered under the KMS DI token; the AI registry never touches plaintext
 * keys itself.
 */
@Injectable()
export class KmsDecryptorService implements IKmsDecryptor {
  private readonly env = new EnvKmsAdapter();
  private readonly gcp = new GcpKmsAdapter();

  async decrypt(blob: string): Promise<string> {
    if (blob.startsWith('gcp-kms:')) return this.gcp.decrypt(blob);
    return this.env.decrypt(blob);
  }
}
