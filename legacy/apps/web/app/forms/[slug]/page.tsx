/** Doc 4 — public-forms (§5 SSR route). Structural skeleton; visual pass in Doc 5. */
import { serverApiBase } from '../../../lib/api-server';
import type { PublicForm } from './public-types';
import { PublicFormView } from './public-form-view';

export const dynamic = 'force-dynamic';

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let form: PublicForm | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(`${serverApiBase()}/v1/public/forms/${slug}`, { cache: 'no-store' });
    if (res.ok) {
      form = (await res.json()) as PublicForm;
    } else if (res.status === 404) {
      error = 'This form does not exist or is no longer published.';
    } else {
      error = 'We could not load this form right now. Please try again shortly.';
    }
  } catch {
    error = 'We could not reach the server. Please try again shortly.';
  }
  // The form body (schema + branding) is server-rendered in the HTML (Doc 4 §F1).
  return <PublicFormView slug={slug} initial={form} error={error} />;
}
