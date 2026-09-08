import { Injectable } from '@nestjs/common';
import type { FormQuestion, IFormQuestionRepository, PaginatedResult, PaginationParams } from '@testimonial-api/domain';
// value import — Nest DI resolves constructor tokens from runtime metadata
import { PrismaClientService } from '../prisma.client';
import { FormQuestionPgMappers } from '../mappers/form-question.mapper';

/**
 * Postgres adapter for the FormQuestion read port. Reads form_questions
 * rows (joined by form_id, ordered by sort_order). Writes stay exclusive
 * to the CollectionForm aggregate (replaceQuestions → form_questions
 * delete+insert in a transaction).
 */
@Injectable()
export class PostgresFormQuestionRepository implements IFormQuestionRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): FormQuestion {
    return FormQuestionPgMappers.toDomain(row as Record<string, unknown>) as FormQuestion;
  }

  async findById(id: string): Promise<FormQuestion | null> {
    const row = await this.prisma.formQuestion.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByForm(formId: string): Promise<FormQuestion[]> {
    const rows = await this.prisma.formQuestion.findMany({
      where: { form_id: formId },
      orderBy: { sort_order: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByFormPaginated(
    formId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FormQuestion>> {
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 50;
    const [rows, total] = await Promise.all([
      this.prisma.formQuestion.findMany({
        where: { form_id: formId },
        orderBy: { sort_order: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.formQuestion.count({ where: { form_id: formId } }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }
}
