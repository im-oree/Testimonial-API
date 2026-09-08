import type { FormQuestion } from './form-question.entity';
import type { RatingType } from './testimonial.entity';

export interface CollectionForm {
  id: string;
  appId: string;
  name: string;
  /** Public URL slug — unique per app. */
  slug: string;
  templateId: string;
  status: 'draft' | 'active' | 'paused';
  ratingType: RatingType;
  collectVideo: boolean;
  collectConsent: boolean;
  redirectUrlOnSuccess: string | null;
  styleOverrides: Record<string, string>;
  submissionCount: number;
  /** Loaded via join (not embedded) in SQL; subcollection-mirror in Firestore. */
  questions: FormQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCollectionForm = Omit<
  CollectionForm,
  'id' | 'createdAt' | 'updatedAt' | 'submissionCount' | 'questions'
> & { questions?: FormQuestion[] };
