import type { IKmsDecryptor } from '@testimonial-api/domain';

/**
 * GcpKmsAdapter — decrypts ai_providers.api_key_encrypted blobs with Google
 * Cloud KMS via its REST API (no @google-cloud/kms dependency).
 *
 * Blob grammar: gcp-kms:<keyName>|<base64 ciphertext>
 *   keyName = projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>
 *
 * Access token comes from the runtime (ADC via metadata server is out of
 * reach in CI; supply GOOGLE_OAUTH_ACCESS_TOKEN or run on GCE where the
 * metadata token is fetched). External sign-off environments configure one
 * of these. In the sandbox every provider uses mock:// or env: blobs, so
 * this adapter is never exercised by CI.
 */
export class GcpKmsAdapter implements IKmsDecryptor {
  private async accessToken(): Promise<string> {
    if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    // GCE metadata (only reachable on GCE/GKE).
    try {
      const res = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'metadata-flavor': 'Google' }, signal: AbortSignal.timeout(2000) },
      );
      if (res.ok) {
        const json = (await res.json()) as { access_token?: string };
        if (json.access_token) return json.access_token;
      }
    } catch {
      // fall through to the error below
    }
    throw new Error('GcpKmsAdapter: no access token (GOOGLE_OAUTH_ACCESS_TOKEN or GCE metadata)');
  }

  async decrypt(blob: string): Promise<string> {
    if (!blob.startsWith('gcp-kms:')) {
      throw new Error(`GcpKmsAdapter: unsupported blob prefix (got "${blob.slice(0, 16)}…")`);
    }
    const rest = blob.slice('gcp-kms:'.length);
    const sep = rest.indexOf('|');
    if (sep === -1) throw new Error('GcpKmsAdapter: blob must be gcp-kms:<keyName>|<b64 ciphertext>');
    const resourceName = rest.slice(0, sep);
    const ciphertext = rest.slice(sep + 1);
    const token = await this.accessToken();
    const res = await fetch(`https://cloudkms.googleapis.com/v1/${resourceName}:decrypt`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ciphertext }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`GcpKmsAdapter: decrypt failed with ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as { plaintext?: string };
    if (!json.plaintext) throw new Error('GcpKmsAdapter: empty plaintext in KMS response');
    return Buffer.from(json.plaintext, 'base64').toString('utf8');
  }
}
