/** Small shared UI pieces — plain CSS classes, no component library. */
import { IconChevronLeft, IconChevronRight, IconStar } from './icons';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { TestimonialStatus } from '../lib/types';

/**
 * Button — the shared action button.
 *
 * `loading` is the canonical busy state: disables (no double-submit), sets
 * aria-busy for assistive tech and shows a spinner before the label. Pages
 * that only swap the label text ('Saving…') work too — this is the upgrade
 * path, not a requirement.
 */
export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  /** Shows a spinner, disables the button and announces it as busy. */
  loading?: boolean;
  /** Optional text shown while loading (defaults to the current children). */
  loadingLabel?: string;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

const STATUS_LABELS: Record<TestimonialStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export function StatusChip({ status }: { status: string }) {
  const label = STATUS_LABELS[status as TestimonialStatus] ?? status;
  return <span className={`chip chip-${status}`}>{label}</span>;
}

export function RatingStars({ value, onChange, size = 'md' }: { value?: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = Boolean(onChange);
  return (
    <span className={`stars stars-${size}${interactive ? ' stars-interactive' : ''}`} role={interactive ? 'radiogroup' : undefined} aria-label={`Rating: ${value ?? 0} of 5`}>
      {stars.map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            aria-checked={value === n}
            role="radio"
            className={n <= (value ?? 0) ? 'star on' : 'star'}
          >
            <IconStar />
          </button>
        ) : (
          // Display-only: plain glyphs, not fake disabled buttons — the wrapper's
          // aria-label already reads the rating to assistive tech.
          <span key={n} aria-hidden="true" className={n <= (value ?? 0) ? 'star on' : 'star'}>
            <IconStar />
          </span>
        )
      )}
    </span>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">◎</div>
      <p>{title}</p>
      {hint && <p className="muted">{hint}</p>}
    </div>
  );
}

export function InlineSpinner() {
  return <span className="spinner spinner-sm" aria-hidden />;
}

export function Loader({ label }: { label: string }) {
  return (
    <div className="block-center">
      <InlineSpinner />
      <p className="muted">{label}</p>
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="field-label">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />;
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? 'on' : ''}`}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <Card className="stat-card">
      <div className="stat-value">{value}</div>
      <div className={`stat-label ${tone ? `tone-${tone}` : ''}`}>{label}</div>
    </Card>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

/** Small breadcrumb trail — shown at the top of every workspace page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="crumb">
          {i > 0 && <span className="crumb-sep">/</span>}
          {c.to ? (
            <Link className="crumb-link" to={c.to}>
              {c.label}
            </Link>
          ) : (
            <span className="crumb-current">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  perPage,
  perPageOptions,
  onChange,
  onPerPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** Rows per page — enables the "Showing X–Y of Z" summary + page-size menu. */
  perPage?: number;
  /** Selectable page sizes (e.g. [7, 15, 30]). Requires onPerPageChange. */
  perPageOptions?: number[];
  onChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}) {
  if (total === 0) return null;
  const pages = Math.max(1, pageCount);

  // Compact page list with ellipsis: 1 … p-1 p p+1 … last
  const pageList: Array<number | 'gap'> = [];
  const window = 1;
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= window) pageList.push(p);
    else if (pageList[pageList.length - 1] !== 'gap') pageList.push('gap');
  }

  const shownFrom = perPage ? (page - 1) * perPage + 1 : 0;
  const shownTo = perPage ? Math.min(page * perPage, total) : 0;

  return (
    <div className="pager">
      <span className="muted small pager-summary">
        {perPage ? (
          <>
            Showing <strong>{shownFrom}</strong>–<strong>{shownTo}</strong> of <strong>{total}</strong>
          </>
        ) : (
          <>
            Page {page} of {pages} · {total} total
          </>
        )}
      </span>
      <div className="pager-controls">
        {perPageOptions && onPerPageChange && (
          <label className="pager-size">
            <span className="muted small">Per page</span>
            <select
              className="input"
              aria-label="Rows per page"
              value={perPageOptions.includes(perPage ?? 0) ? perPage : perPageOptions[0]}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="pager-buttons">
          <Button variant="secondary" className="btn-xs" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
            <IconChevronLeft size={13} /> Prev
          </Button>
          {pageList.map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="pager-gap">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pager-num ${p === page ? 'active' : ''}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            ),
          )}
          <Button variant="secondary" className="btn-xs" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
            Next <IconChevronRight size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
