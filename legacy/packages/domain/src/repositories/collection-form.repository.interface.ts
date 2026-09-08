import type { CreateFormQuestion, FormQuestion } from '../entities/form-question.entity';
import type { CollectionForm, CreateCollectionForm } from '../entities/collection-form.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface ICollectionFormRepository {
  findById(id: string): Promise<CollectionForm | null>;
  /** Form + its questions in one aggregate load. */
  findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<CollectionForm>>;
  findByAppAndSlug(appId: string, slug: string): Promise<CollectionForm | null>;
  create(data: CreateCollectionForm): Promise<CollectionForm>;
  update(id: string, data: Partial<CollectionForm>): Promise<CollectionForm>;
  incrementSubmissionCount(id: string): Promise<void>;
  /** Form questions are owned rows (not embedded JSON) in both engines. */
  replaceQuestions(formId: string, questions: CreateFormQuestion[]): Promise<FormQuestion[]>;
  delete(id: string): Promise<void>;
}
