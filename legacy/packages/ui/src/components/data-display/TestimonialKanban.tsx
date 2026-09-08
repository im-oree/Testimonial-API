/** TestimonialKanban — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export interface KanbanColumn { id: string; title: string; items: Array<{ id: string; summary: string; status: string }> }
export function TestimonialKanban({ columns, onMove, className }: { columns: KanbanColumn[]; onMove?: (itemId: string, toColumnId: string) => void; className?: string }) {
  return (
    <div data-component="TestimonialKanban" data-testid="kanban" className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>
      {columns.map((col) => (
        <section key={col.id} data-column={col.id} className="rounded-xl border border-border bg-background-subtle/40 p-3">
          <h3 className="mb-3 px-1 text-sm font-semibold text-foreground">{col.title} ({col.items.length})</h3>
          <div className="space-y-2">
            {col.items.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-background-elevated p-3 shadow-xs">
                <p className="text-xs text-foreground line-clamp-2">{item.summary}</p>
                <select value={item.status} aria-label="Move to"
                  onChange={(e) => onMove?.(item.id, e.target.value)}
                  className="mt-2 h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none">
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </article>
            ))}
            {col.items.length === 0 && <p className="px-1 py-4 text-center text-xs text-foreground-tertiary">Empty</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
