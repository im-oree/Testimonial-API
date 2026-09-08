import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CollectionForm,
  CreateCollectionForm,
  CreateFormQuestion,
  FormQuestion,
  ICollectionFormRepository,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { CollectionFormFirestoreMapper } from '../mappers/collection-form.mapper';
import { FormQuestionFirestoreMapper } from '../mappers/form-question.mapper';

/** Loads CollectionForm + joined questions (SQL join ↔ Firestore formQuestions collection). */
@Injectable()
export class FirestoreCollectionFormRepository
  extends FirestoreBaseRepository<Omit<CollectionForm, 'questions'>>
  implements ICollectionFormRepository
{
  protected readonly collectionName = 'collectionForms';
  protected readonly mapper = CollectionFormFirestoreMapper;

  private readonly questionsCol = () => this.client.db.collection('formQuestions');

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Omit<CollectionForm, 'questions'>>): Partial<Omit<CollectionForm, 'questions'>> {
    return {
      status: 'draft',
      ratingType: 'star5',
      collectVideo: false,
      collectConsent: true,
      styleOverrides: {},
      submissionCount: 0,
    };
  }

  override async findById(id: string): Promise<CollectionForm | null> {
    const form = await super.findById(id);
    if (!form) return null;
    const questions = await this.loadQuestions(id);
    return { ...form, questions };
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<CollectionForm>> {
    const all = await this.fetchAll('appId', appId);
    const paged = this.pageInMemory(all, pagination);
    const withQuestions = await Promise.all(
      paged.items.map(async (f) => ({ ...f, questions: await this.loadQuestions(f.id) })),
    );
    return { ...paged, items: withQuestions };
  }

  async findByAppAndSlug(appId: string, slug: string): Promise<CollectionForm | null> {
    const all = await this.fetchAll('appId', appId);
    const form = all.find((f) => f.slug === slug) ?? null;
    if (!form) return null;
    const questions = await this.loadQuestions(form.id);
    return { ...form, questions };
  }

  override async create(data: CreateCollectionForm): Promise<CollectionForm> {
    const { questions, ...rest } = data;
    const created = await super.create(rest as Partial<Omit<CollectionForm, 'questions'>>);
    const questionRows = await this.replaceQuestions(created.id, questions ?? []);
    return { ...created, questions: questionRows };
  }

  override async update(id: string, data: Partial<CollectionForm>): Promise<CollectionForm> {
    const { questions, ...rest } = data;
    const updated = await super.update(id, rest as Partial<Omit<CollectionForm, 'questions'>>);
    let questionRows: FormQuestion[];
    if (questions) {
      questionRows = await this.replaceQuestions(id, questions);
    } else {
      questionRows = await this.loadQuestions(id);
    }
    return { ...updated, questions: questionRows };
  }

  async incrementSubmissionCount(id: string): Promise<void> {
    const snap = await this.col().doc(id).get();
    const current = Number((snap.data() ?? {}).submissionCount ?? 0);
    await this.col().doc(id).update({ submissionCount: current + 1 });
  }

  private async loadQuestions(formId: string): Promise<FormQuestion[]> {
    const snap = await this.questionsCol().where('formId', '==', formId).get();
    return snap.docs
      .map((d) => FormQuestionFirestoreMapper.toDomain({ id: d.id, data: d.data() }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async replaceQuestions(formId: string, questions: CreateFormQuestion[]): Promise<FormQuestion[]> {
    const existing = await this.questionsCol().where('formId', '==', formId).get();
    const batch = this.client.db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const created: FormQuestion[] = [];
    for (const q of questions) {
      const id = randomUUID();
      const data = FormQuestionFirestoreMapper.toPersistence({ ...q, id, formId } as Partial<FormQuestion>);
      await this.questionsCol().doc(id).set({ ...data });
      created.push({ ...q, id, formId });
    }
    return created.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  delete(id: string): Promise<void> {
    return this.deleteHard(id);
  }
}
