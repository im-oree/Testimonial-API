import type { FormQuestion } from '../entities/form-question.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

/**
 * IFormQuestionRepository — read-side port for form questions.
 *
 * FormQuestion is an OWNED AGGREGATE of CollectionForm (SQL rows on
 * form_questions / Firestore docs under formQuestions). Writes are
 * intentionally NOT exposed here: mutating a form's question set goes
 * through ICollectionFormRepository.replaceQuestions so the aggregate
 * stays consistent in a single operation. Both adapters implement this
 * read interface; the module ownership map (docs §10) keeps questions
 * under the forms module.
 */
export interface IFormQuestionRepository {
  findById(id: string): Promise<FormQuestion | null>;
  findByForm(formId: string): Promise<FormQuestion[]>;
  findByFormPaginated(formId: string, pagination: PaginationParams): Promise<PaginatedResult<FormQuestion>>;
}
