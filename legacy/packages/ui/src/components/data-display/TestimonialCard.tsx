/** TestimonialCard — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

import { StatusBadge } from './StatusBadge';
export function TestimonialCard({ content, author, rating, status, onApprove, onReject, canModerate, className }: {
  content: string; author?: string; rating?: number; status: string;
  onApprove?: () => void; onReject?: () => void; canModerate?: boolean; className?: string;
}) {
  return (
    <article data-component="TestimonialCard" data-testid="testimonial-card"
      className={`rounded-lg border border-border bg-background-elevated p-4 shadow-xs transition-shadow hover:shadow-md ${className ?? ''}`}>
      <blockquote className="text-sm text-foreground">&ldquo;{content}&rdquo;</blockquote>
      {rating !== undefined && <p className="mt-2 text-xs text-warning">{'★'.repeat(Math.max(1, Math.round(rating)))}</p>}
      {(author || canModerate) && (
        <footer className="mt-3 flex items-center justify-between gap-2">
          {author && <span className="truncate text-xs font-medium text-foreground-secondary">— {author}</span>}
          <StatusBadge status={status} />
          {canModerate && (
            <span className="flex gap-1">
              <button type="button" onClick={onApprove} aria-label="Approve"
                className="flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-success hover:bg-success hover:text-white">✓</button>
              <button type="button" onClick={onReject} aria-label="Reject"
                className="flex h-6 w-6 items-center justify-center rounded-md bg-error/15 text-error hover:bg-error hover:text-white">✕</button>
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
