import { Injectable } from '@nestjs/common';
import type {
  CreateTemplate,
  ITemplateRepository,
  PaginatedResult,
  PaginationParams,
  Template,
  TemplateType,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { TemplateFirestoreMapper } from '../mappers/template.mapper';

@Injectable()
export class FirestoreTemplateRepository extends FirestoreBaseRepository<Template> implements ITemplateRepository {
  protected readonly collectionName = 'templates';
  protected readonly mapper = TemplateFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Template>): Partial<Template> {
    return { version: 1, isPremium: false, status: 'active', configSchema: [] };
  }

  async findActiveByType(type: TemplateType): Promise<Template[]> {
    const snap = await this.col().where('type', '==', type).get();
    return snap.docs
      .map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }))
      .filter((t) => t.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findMany(filters: { type?: TemplateType }, pagination: PaginationParams): Promise<PaginatedResult<Template>> {
    const all = filters.type
      ? await this.fetchAll('type', filters.type)
      : (await this.col().get()).docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
    return this.pageInMemory(all, pagination);
  }

  override create(data: CreateTemplate): Promise<Template> {
    return super.create(data as Partial<Template>);
  }
}
