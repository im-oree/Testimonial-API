/**
 * IKmsDecryptor — secret-decryption port (provider API keys).
 *
 * ai_providers.api_key_encrypted is a KMS ciphertext blob, never plaintext
 * at rest. Concrete implementations live in infrastructure/:
 *  • env/dev adapter — mock:// and env:VAR blobs (no external KMS reachable)
 *  • GCP KMS adapter — REST call for gcp-kms: projects/... blobs
 * The AI registry decrypts only in memory, for the duration of a call.
 */
export interface IKmsDecryptor {
  /** Decrypt a stored blob to plaintext. Throws on undecryptable blobs. */
  decrypt(blob: string): Promise<string>;
}
