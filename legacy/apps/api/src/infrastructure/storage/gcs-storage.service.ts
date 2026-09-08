import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

/**
 * GCS object storage — avatar/media uploads, CSV imports, Firestore→SQL
 * migration exports. Lazily initializes from GOOGLE_APPLICATION_CREDENTIALS
 * + GCS_BUCKET_NAME; boots fine without them (fails on use with a clear
 * error). Signed short-lived upload/download URLs are the only thing the
 * API hands to browsers (README §27).
 */
@Injectable()
export class GcsStorageService {
  private readonly logger = new Logger(GcsStorageService.name);
  private storage: Storage | null = null;

  private ensureStorage(): Storage {
    if (!this.storage) {
      const bucketName = process.env.GCS_BUCKET_NAME;
      if (!bucketName) {
        throw new Error('GCS not configured: set GCS_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS');
      }
      this.storage = new Storage();
      this.logger.log(`GCS initialized (bucket: ${bucketName})`);
    }
    return this.storage;
  }

  get bucketName(): string | null {
    return process.env.GCS_BUCKET_NAME ?? null;
  }

  /** Upload a Buffer with a content type; returns the object name. */
  async upload(objectName: string, body: Buffer, contentType: string): Promise<string> {
    const bucket = this.ensureStorage().bucket(this.bucketName!);
    await bucket.file(objectName).save(body, { contentType, resumable: false });
    return objectName;
  }

  /** Signed URL valid for `expiresInSeconds` (default 15 min) for direct browser upload/download. */
  async signedUploadUrl(objectName: string, contentType: string, expiresInSeconds = 900): Promise<string> {
    const bucket = this.ensureStorage().bucket(this.bucketName!);
    const [url] = await bucket.file(objectName).getSignedUrl({
      action: 'write',
      version: 'v4',
      expires: Date.now() + expiresInSeconds * 1000,
      contentType,
    });
    return url;
  }

  async signedDownloadUrl(objectName: string, expiresInSeconds = 900): Promise<string> {
    const bucket = this.ensureStorage().bucket(this.bucketName!);
    const [url] = await bucket.file(objectName).getSignedUrl({
      action: 'read',
      version: 'v4',
      expires: Date.now() + expiresInSeconds * 1000,
    });
    return url;
  }
}
