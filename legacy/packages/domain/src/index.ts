// ============================================================
// @testimonial-api/domain — PUBLIC API of the domain package.
//
// Pure, storage-agnostic core shared by apps/api and apps/worker.
// Importing this package MUST NOT pull in any storage driver.
// ============================================================

export * from './entities';
export * from './errors';
export * from './value-objects';
export * from './state';
export * from './utils/id-generator';
export * from './repositories';
