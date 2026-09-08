/** DataTable — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export interface Column<T> { key: string; header: string; cell?: (row: T) => ReactNode }
export function DataTable<T>({ data, columns, selectable, selectedKeys, onToggleRow, emptyLabel = 'No results', loading }: {
  data: T[]; columns: Column<T>[]; selectable?: boolean; selectedKeys?: Set<string> | null;
  onToggleRow?: (row: T, checked: boolean) => void; emptyLabel?: string; loading?: boolean;
}) {
  const idOf = (row: T): string => String((row as Record<string, unknown>)['id'] ?? JSON.stringify(row));
  const allSelected = data.length > 0 && (selectedKeys?.size ?? 0) === data.length && data.every((r) => selectedKeys?.has(idOf(r)));
  return (
    <div data-component="DataTable" className="overflow-hidden rounded-xl border border-border bg-background-elevated">
      <table data-testid="data-table" className="w-full border-collapse text-left">
        <thead className="border-b border-border bg-background-subtle">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} aria-label="Select all rows"
                  onChange={() => data.forEach((r) => onToggleRow?.(r, !allSelected))} className="h-4 w-4 accent-primary-500" />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} className="cursor-pointer px-4 py-3 text-xs font-medium tracking-wide text-foreground-tertiary uppercase select-none hover:text-foreground">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border-subtle last:border-0">
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-3"><div className="h-4 animate-pulse rounded-md bg-background-muted" /></td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-sm text-foreground-tertiary">{emptyLabel}</td></tr>
          ) : (
            data.map((row) => {
              const id = idOf(row);
              const selected = selectedKeys?.has(id) ?? false;
              return (
                <tr key={id} className={`border-b border-border-subtle transition-colors duration-100 last:border-0 hover:bg-background-subtle/50 ${selected ? 'bg-primary-50/70 dark:bg-primary-950/30' : ''}`}>
                  {selectable && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected} aria-label="Select row"
                        onChange={(e) => onToggleRow?.(row, e.target.checked)} className="h-4 w-4 accent-primary-500" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-sm text-foreground">{c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '')}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
