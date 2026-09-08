import { Injectable } from '@nestjs/common';
import type {
  App,
  CreateApp,
  IAppRepository,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { AppFirestoreMapper } from '../mappers/app.mapper';

@Injectable()
export class FirestoreAppRepository extends FirestoreBaseRepository<App> implements IAppRepository {
  protected readonly collectionName = 'apps';
  protected readonly mapper = AppFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  // App seed defaults: active app, quotas, CORS whitelist + captcha on.
  protected override defaultsFor(_e: Partial<App>): Partial<App> {
    return {
      status: 'active',
      quotaTestimonialsPerMonth: 50,
      quotaWidgetsMax: 3,
      quotaFormsMax: 3,
      quotaSeatMax: 5,
      allowedOrigins: [],
      requireCaptchaOnForms: true,
    };
  }

  /** Structural hard-delete (admin/maintenance only) — business flow archives. */
  override async deleteHard(id: string): Promise<void> {
    await this.col().doc(id).delete();
  }

  findByPublicId(publicId: string): Promise<App | null> {
    return this.findByField('publicId', publicId);
  }

  async findByTenant(tenantId: string): Promise<App[]> {
    const all = await this.fetchAll('tenantId', tenantId);
    return all.filter((a) => !a.archivedAt);
  }

  async findMany(
    filters: { tenantId?: string; search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<App>> {
    const base = filters.tenantId ? await this.fetchAll('tenantId', filters.tenantId) : await this.col().get().then(
      (snap) => snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() })),
    );
    const live = base.filter((a) => !a.archivedAt);
    const q = filters.search
      ? live.filter((a) => a.name.toLowerCase().includes(filters.search!.toLowerCase()))
      : live;
    return this.pageInMemory(q, pagination);
  }

  override create(data: CreateApp & { publicId: string }): Promise<App> {
    return super.create(data as Partial<App>);
  }

  async updateAllowedOrigins(id: string, origins: string[]): Promise<void> {
    await this.col().doc(id).update({ allowedOrigins: origins, updatedAt: new Date() });
  }

  archive(id: string): Promise<void> {
    return this.col().doc(id).update({ archivedAt: new Date(), updatedAt: new Date() }).then(() => undefined);
  }
}
