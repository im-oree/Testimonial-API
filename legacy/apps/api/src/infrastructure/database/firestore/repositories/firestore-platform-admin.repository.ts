import { Injectable } from '@nestjs/common';
import type {
  CreatePlatformAdmin,
  IPlatformAdminRepository,
  PaginatedResult,
  PaginationParams,
  PlatformAdmin,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { PlatformAdminFirestoreMapper } from '../mappers/platform-admin.mapper';

@Injectable()
export class FirestorePlatformAdminRepository
  extends FirestoreBaseRepository<PlatformAdmin>
  implements IPlatformAdminRepository
{
  protected readonly collectionName = 'platformAdmins';
  protected readonly mapper = PlatformAdminFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  findByUserId(userId: string): Promise<PlatformAdmin | null> {
    return this.findByField('userId', userId);
  }

  async findMany(
    filters: { search?: string },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<PlatformAdmin>> {
    const all = await this.fetchAll('status', 'active');
    const q = filters.search
      ? all.filter((p) => p.userId.toLowerCase().includes(filters.search!.toLowerCase()))
      : all;
    return this.pageInMemory(q, pagination);
  }

  override create(data: CreatePlatformAdmin): Promise<PlatformAdmin> {
    return super.create(data as Partial<PlatformAdmin>);
  }
}
