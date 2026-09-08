// Worker adapter layer.
//
// Doc-1 architecture note: repository PORTS (interfaces + tokens) live in
// @testimonial-api/domain and are already shared with apps/api. The concrete
// Firestore/Postgres adapter implementations currently live in apps/api per
// docs/01-skeleton.md §2; Doc 2 lifts them into a shared persistence package
// so this process consumes the SAME adapters as the API service (no drift).
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';

export const WORKER_REPOSITORY_TOKENS = REPOSITORY_TOKENS;
