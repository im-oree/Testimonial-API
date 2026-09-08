/** FormBuilder — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export interface FormQuestionSpec { id: string; type: 'text' | 'rating' | 'video' | 'select'; label: string; required?: boolean }
export function FormBuilder({ formName, questions, onChange, className }: {
  formName: string; questions: FormQuestionSpec[]; onChange?: (q: FormQuestionSpec[]) => void; className?: string;
}) {
  const update = (id: string, patch: Partial<FormQuestionSpec>): void =>
    onChange?.(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <div data-component="FormBuilder" data-testid="form-builder" className={`space-y-3 ${className ?? ''}`}>
      <h3 className="text-base font-semibold text-foreground">{formName}</h3>
      {questions.map((q) => (
        <fieldset key={q.id} className="rounded-lg border border-border bg-background-elevated p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={q.type} onChange={(e) => update(q.id, { type: e.target.value as FormQuestionSpec['type'] })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none">
              <option value="text">Text</option>
              <option value="rating">Rating</option>
              <option value="video">Video</option>
              <option value="select">Select</option>
            </select>
            <input defaultValue={q.label} aria-label="Question label" onBlur={(e) => update(q.id, { label: e.target.value })}
              className="h-8 min-w-40 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
            <label className="flex items-center gap-1 text-xs text-foreground-secondary">
              <input type="checkbox" checked={q.required ?? false} onChange={(e) => update(q.id, { required: e.target.checked })} className="h-3.5 w-3.5 accent-primary-500" /> Required
            </label>
            <button type="button" onClick={() => onChange?.(questions.filter((x) => x.id !== q.id))}
              className="h-8 rounded-md px-2 text-xs text-error hover:bg-error/10">Remove</button>
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange?.([...questions, { id: crypto.randomUUID(), type: 'text', label: 'New question', required: false }])}
        className="h-9 rounded-md border border-dashed border-border px-3 text-sm font-medium text-foreground-secondary hover:border-primary-500 hover:text-primary-500">
        + Add question
      </button>
    </div>
  );
}
