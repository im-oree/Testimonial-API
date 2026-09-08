export interface PublicFormQuestion {
  id: string;
  type: 'text' | 'rating' | 'video' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

export interface PublicForm {
  id: string;
  slug: string;
  name: string;
  tenantName: string;
  logoUrl?: string | null;
  brandColor: string;
  questions: PublicFormQuestion[];
}
