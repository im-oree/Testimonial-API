import { Injectable } from '@nestjs/common';
import type { CreateWidget, IWidgetRepository, PaginatedResult, PaginationParams, Widget } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { WidgetFirestoreMapper } from '../mappers/widget.mapper';

@Injectable()
export class FirestoreWidgetRepository extends FirestoreBaseRepository<Widget> implements IWidgetRepository {
  protected readonly collectionName = 'widgets';
  protected readonly mapper = WidgetFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Widget>): Partial<Widget> {
    return {
      isPublished: false,
      filter: { tags: [], minRating: null, featuredOnly: false, limit: 10 },
    };
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Widget>> {
    const all = await this.fetchAll('appId', appId);
    return this.pageInMemory(all, pagination);
  }

  async findPublishedByApp(appId: string): Promise<Widget[]> {
    const all = await this.fetchAll('appId', appId);
    return all.filter((w) => w.isPublished);
  }

  override create(data: CreateWidget): Promise<Widget> {
    return super.create(data as Partial<Widget>);
  }

  delete(id: string): Promise<void> {
    return this.deleteHard(id);
  }
}
