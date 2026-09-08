import { Injectable } from '@nestjs/common';
import type { FormQuestion, IFormQuestionRepository, PaginatedResult, PaginationParams } from '@testimonial-api/domain';
// value import — Nest DI resolves constructor tokens from runtime metadata
import { FirestoreClient } from '../firestore.client';
import { FormQuestionFirestoreMapper } from '../mappers/form-question.mapper';

/**
 * Firestore adapter for the FormQuestion read port. Questions are stored
 * as top-level docs in the formQuestions collection (flattened, per Doc 1
 * §7) with a denormalized formId FK — the same physical store the
 * CollectionForm aggregate repo reads/writes via replaceQuestions.
 */
@Injectable()
export class FirestoreFormQuestionRepository implements IFormQuestionRepository {
  private readonly col = () => this.client.db.collection('formQuestions');

  constructor(private readonly client: FirestoreClient) {}

  async findById(id: string): Promise<FormQuestion | null> {
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    return FormQuestionFirestoreMapper.toDomain({ id: snap.id, data: snap.data() ?? {} });
  }

  async findByForm(formId: string): Promise<FormQuestion[]> {
    const snap = await this.col().where('formId', '==', formId).orderBy('sortOrder', 'asc').get();
    return snap.docs.map((d) => FormQuestionFirestoreMapper.toDomain({ id: d.id, data: d.data() }));
  }

  async findByFormPaginated(
    formId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FormQuestion>> {
    const all = await this.findByForm(formId);
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 50;
    return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize };
  }
}
