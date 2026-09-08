export type QuestionType = 'text' | 'textarea' | 'rating' | 'video' | 'photo' | 'select';

export interface FormQuestion {
  id: string;
  formId: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
}

export type CreateFormQuestion = Omit<FormQuestion, 'id'>;
