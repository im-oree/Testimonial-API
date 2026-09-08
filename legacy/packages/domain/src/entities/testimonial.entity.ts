export type TestimonialSource = 'manual' | 'form' | 'api' | 'twitter_import' | 'csv_import';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type RatingType = 'star5' | 'nps' | 'thumbs' | 'none';

export interface Testimonial {
  id: string;
  appId: string;
  environment: 'live' | 'test';
  authorName: string;
  authorTitle: string | null;
  authorCompany: string | null;
  authorAvatarUrl: string | null;
  /** Never exposed via any public API — tenant dashboard only (README §31). */
  authorEmail: string | null;
  message: string;
  /** 1–5 for star5; nullable for nps/thumbs/none. */
  rating: number | null;
  ratingType: RatingType;
  mediaUrls: string[];
  videoUrl: string | null;
  source: TestimonialSource;
  sourceRef: string | null;
  status: TestimonialStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  tags: string[];
  featured: boolean;
  sortOrder: number;
  customFields: Record<string, string>;
  /** hash(authorName|message) — dedupe key (unique per app in SQL). */
  fingerprint: string;
  language: string | null;
  consentGiven: boolean;
  /** Soft-delete marker (SQL: deleted_at). Moderation archives keep rows; delete marks this. */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTestimonial = Omit<
  Testimonial,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'status'
  | 'reviewedBy'
  | 'reviewedAt'
  | 'rejectionReason'
  | 'featured'
  | 'sortOrder'
  | 'tags'
  | 'mediaUrls'
>;
