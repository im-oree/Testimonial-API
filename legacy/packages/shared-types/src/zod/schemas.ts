import { z } from 'zod';

// ============================================================
// Minimal shared zod schemas. These prove the FE/BE sharing
// pattern; the exhaustive DTO catalogue arrives in Doc 3 (API
// layer), generated into OpenAPI from these + NestJS decorators.
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export const statusQuerySchema = z.enum(['pending', 'approved', 'rejected', 'archived']).optional();

export const createTestimonialSchema = z.object({
  author: z.object({
    name: z.string().trim().min(1).max(120),
    title: z.string().trim().max(120).nullish(),
    company: z.string().trim().max(120).nullish(),
    email: z.string().email().nullish(), // internal only — never exposed via public API
  }),
  content: z.object({
    message: z.string().trim().min(1).max(10000),
    rating: z.number().int().min(1).max(5).nullish(),
    ratingType: z.enum(['star5', 'nps', 'thumbs', 'none']).default('star5'),
  }),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  consentGiven: z.boolean().default(false),
});

export type CreateTestimonialPayload = z.infer<typeof createTestimonialSchema>;
