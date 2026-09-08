import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

/**
 * FirestoreClient — single Admin SDK entry point (prototype adapter).
 *
 * Boot policy (skeleton-friendly):
 *  • FIRESTORE_EMULATOR_HOST set  → connect to the local emulator
 *    (`npm run emulators`), zero credentials needed.
 *  • GOOGLE_APPLICATION_CREDENTIALS / default creds available → real project.
 *  • Neither → boot STILL SUCCEEDS with a warning; any repository call
 *    throws a descriptive error. This keeps local DX instant while never
 *    letting a misconfigured deploy half-work.
 *
 * ONLY files under infrastructure/database may import this class.
 */
@Injectable()
export class FirestoreClient implements OnModuleInit {
  private readonly logger = new Logger(FirestoreClient.name);
  private initialized = false;
  private initError: Error | null = null;
  private _db: Firestore | null = null;

  onModuleInit(): void {
    try {
      this.ensureInitialized();
    } catch (err) {
      this.initError = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        `Firestore not initialized — repository calls will fail with a descriptive error. ` +
          `Set FIRESTORE_EMULATOR_HOST (local) or GOOGLE_APPLICATION_CREDENTIALS (prod). Cause: ${this.initError.message}`,
      );
    }
  }

  /** Lazily initialize once. Idempotent. */
  ensureInitialized(): void {
    if (this.initialized && this._db) return;
    if (admin.apps.length === 0) {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
      if (emulatorHost) {
        this.logger.log(`Connecting to Firestore EMULATOR at ${emulatorHost}`);
        admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-testimonial' });
      } else {
        this.logger.log('Connecting to Firestore via application-default credentials');
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
      }
    }
    this._db = admin.firestore();
    this.initialized = true;
  }

  get db(): Firestore {
    if (!this.initialized || !this._db) {
      this.ensureInitialized();
    }
    if (!this._db) {
      throw this.initError ?? new Error('Firestore is not initialized');
    }
    return this._db;
  }

  /** True when talking to a local emulator (used by e2e/integration tests). */
  get isEmulator(): boolean {
    return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  }
}
