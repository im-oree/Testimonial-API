// Facade over the shared domain package — keeps api-side imports stable if
// the package path ever changes: `import { Tenant } from '../domain'`.
export * from '@testimonial-api/domain';
