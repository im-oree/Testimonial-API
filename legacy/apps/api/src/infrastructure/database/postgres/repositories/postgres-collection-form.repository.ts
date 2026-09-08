import { Injectable } from '@nestjs/common';
import type {
  CollectionForm,
  CreateCollectionForm,
  CreateFormQuestion,
  FormQuestion,
  ICollectionFormRepository,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { CollectionFormPgMappers } from '../mappers/collection-form.mapper';
import { FormQuestionPgMappers } from '../mappers/form-question.mapper';

@Injectable()
export class PostgresCollectionFormRepository implements ICollectionFormRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toForm(row: unknown): Omit<CollectionForm, 'questions'> {
    return CollectionFormPgMappers.toDomain(row as Record<string, unknown>) as Omit<CollectionForm, 'questions'>;
  }

  private toQuestion(row: unknown): FormQuestion {
    return FormQuestionPgMappers.toDomain(row as Record<string, unknown>) as FormQuestion;
  }

  private async attachQuestions(form: Omit<CollectionForm, 'questions'>): Promise<CollectionForm> {
    const rows = await this.prisma.formQuestion.findMany({
      where: { form_id: form.id },
      orderBy: { sort_order: 'asc' },
    });
    return { ...form, questions: rows.map((r) => this.toQuestion(r)) };
  }

  async findById(id: string): Promise<CollectionForm | null> {
    const row = await this.prisma.collectionForm.findUnique({ where: { id } });
    return row ? this.attachQuestions(this.toForm(row)) : null;
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<CollectionForm>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { app_id: appId };
    const [rows, total] = await Promise.all([
      this.prisma.collectionForm.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.collectionForm.count({ where }),
    ]);
    const items = await Promise.all(rows.map(async (r) => this.attachQuestions(this.toForm(r))));
    return { items, total, page, pageSize };
  }

  async findByAppAndSlug(appId: string, slug: string): Promise<CollectionForm | null> {
    const row = await this.prisma.collectionForm.findUnique({ where: { app_id_slug: { app_id: appId, slug } } });
    return row ? this.attachQuestions(this.toForm(row)) : null;
  }

  async create(data: CreateCollectionForm): Promise<CollectionForm> {
    const { questions, ...rest } = data;
    const row = await this.prisma.collectionForm.create({
      data: CollectionFormPgMappers.toPersistence(rest as Partial<Omit<CollectionForm, 'questions'>>) as never,
    });
    const form = this.toForm(row);
    const questionRows = await this.replaceQuestions(form.id, questions ?? []);
    return { ...form, questions: questionRows };
  }

  async update(id: string, data: Partial<CollectionForm>): Promise<CollectionForm> {
    const { questions, ...rest } = data;
    const row = await this.prisma.collectionForm.update({
      where: { id },
      data: { ...CollectionFormPgMappers.toPersistence(rest as Partial<Omit<CollectionForm, 'questions'>>), updated_at: new Date() } as never,
    });
    const form = this.toForm(row);
    const questionRows = questions ? await this.replaceQuestions(id, questions) : await this.prisma.formQuestion.findMany({
      where: { form_id: id },
      orderBy: { sort_order: 'asc' },
    }).then((rs) => rs.map((r) => this.toQuestion(r)));
    return { ...form, questions: questionRows };
  }

  async incrementSubmissionCount(id: string): Promise<void> {
    await this.prisma.collectionForm.update({
      where: { id },
      data: { submission_count: { increment: 1 } },
    });
  }

  async replaceQuestions(formId: string, questions: CreateFormQuestion[]): Promise<FormQuestion[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.formQuestion.deleteMany({ where: { form_id: formId } });
      for (const q of questions) {
        const row = FormQuestionPgMappers.toPersistence({ ...q, formId } as Partial<FormQuestion>);
        delete row.id;
        await tx.formQuestion.create({ data: { ...row, form_id: formId } as never });
      }
    });
    const rows = await this.prisma.formQuestion.findMany({
      where: { form_id: formId },
      orderBy: { sort_order: 'asc' },
    });
    return rows.map((r) => this.toQuestion(r));
  }

  async delete(id: string): Promise<void> {
    // FK CASCADE removes form_questions.
    await this.prisma.collectionForm.delete({ where: { id } });
  }
}
