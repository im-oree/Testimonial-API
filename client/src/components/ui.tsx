/** Small shared UI pieces — plain CSS classes, no component library. */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { TestimonialStatus } from '../lib/types';

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' }) {
  return <button className={`btn btn-${variant} ${className}`} {...rest} />;
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
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          aria-checked={value === n}
          role={interactive ? 'radio' : undefined}
          className={n <= (value ?? 0) ? 'star on' : 'star'}
        >
          ★
        </button>
      ))}
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

export function Pager({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
  if (total === 0) return null;
  const pages = Math.max(1, pageCount);
  return (
    <div className="pager">
      <span className="muted small">
        Page {page} of {pages} · {total} total
      </span>
      <div className="pager-buttons">
        <Button variant="secondary" className="btn-xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹ Prev
        </Button>
        <Button variant="secondary" className="btn-xs" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next ›
        </Button>
      </div>
    </div>
  );
}
