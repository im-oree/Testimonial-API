/** Doc 4 — tenant dashboard (widgets/[id]). Structural skeleton; visual pass in Doc 5. */
import { WidgetEditorView } from '../widget-editor-view';

export const dynamic = 'force-dynamic';

export default async function WidgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WidgetEditorView widgetId={id} />;
}
