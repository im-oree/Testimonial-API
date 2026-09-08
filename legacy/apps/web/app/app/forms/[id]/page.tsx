/** Doc 4 — tenant dashboard (forms/[id]). Structural skeleton; visual pass in Doc 5. */
import { FormEditorView } from '../form-editor-view';

export const dynamic = 'force-dynamic';

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormEditorView formId={id} />;
}
