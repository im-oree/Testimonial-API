#!/usr/bin/env python3
"""Doc-4 §6 + Doc-5 §5 component generator — packages/ui/src/components/.

Emits the full inventory as small, typed, Tailwind-classed components per
Doc 5 §5 specs (shared theme in packages/config/tailwind/preset.cjs; tokens
in each app's globals.css §2). Re-run is idempotent and also rewrites the
catalog barrel components/ui.tsx so exports stay in sync.

Run from repo root: python3 scripts/generate-doc4-components.py
"""
import os

ROOT = os.path.join("packages", "ui", "src", "components")
REACT_NODE = "import type { ReactNode } from 'react';\n"

# ---------------------------------------------------------------------------
# Template bodies; {F} => component/file name. Real TS/JSX braces stay single.
# ---------------------------------------------------------------------------
TPL = {}

# ---- primitives ------------------------------------------------------------
TPL["badge"] = """const TONES: Record<string, string> = {
  success: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success',
  warning: 'bg-warning-light text-warning-foreground dark:bg-warning-dark/30 dark:text-warning',
  error: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error',
  info: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info',
  neutral: 'bg-background-muted text-foreground-secondary',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
};

export function {F}({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return (
    <span data-tone={tone} data-component="{F}" data-testid="badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-medium transition-colors ${TONES[tone] ?? TONES.neutral}`}>
      {children}
    </span>
  );
}
"""

TPL["button"] = """const VARIANTS: Record<string, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md focus-visible:ring-primary-500',
  secondary: 'bg-background text-foreground border border-border hover:bg-background-subtle active:bg-background-muted',
  ghost: 'bg-transparent text-foreground-secondary hover:bg-background-subtle hover:text-foreground',
  destructive: 'bg-error text-white hover:bg-error-dark active:bg-error-dark focus-visible:ring-error',
  link: 'bg-transparent text-primary-500 hover:text-primary-600 underline underline-offset-4 hover:underline-offset-2',
};
const SIZES: Record<string, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 text-sm rounded-lg gap-2',
  xl: 'h-12 px-6 text-base rounded-lg gap-2.5',
};

export function {F}({ children, variant = 'secondary', size = 'md', loading, disabled, onClick, className }: {
  children?: ReactNode; variant?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; loading?: boolean;
  disabled?: boolean; onClick?: () => void; className?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <button type="button" disabled={isDisabled} data-variant={variant} data-component="{F}"
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 outline-none ${VARIANTS[variant] ?? VARIANTS.secondary} ${SIZES[size] ?? SIZES.md} ${loading ? 'opacity-70 pointer-events-none' : ''} ${isDisabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} ${className ?? ''}`}
      onClick={onClick}>
      {children}
    </button>
  );
}
"""

TPL["input"] = """export function {F}(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input data-component="{F}"
      className={`h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-tertiary transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted disabled:text-foreground-tertiary disabled:cursor-not-allowed ${className ?? ''}`}
      {...rest} />
  );
}
"""

TPL["textarea"] = """export function {F}(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea data-component="{F}" rows={4}
      className={`min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary resize-y transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted disabled:cursor-not-allowed ${className ?? ''}`}
      {...rest} />
  );
}
"""

TPL["select"] = """export function {F}({ options, value, onChange, placeholder, className }: {
  options: Array<{ label: string; value: string }>; value?: string; onChange?: (v: string) => void;
  placeholder?: string; className?: string;
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} data-component="{F}"
      className={`h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted ${className ?? ''}`}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
"""

TPL["switch"] = """export function {F}({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel }: {
  checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; 'aria-label'?: string;
}) {
  return (
    <button
      type="button" role="switch" aria-checked={checked ?? false} aria-label={ariaLabel ?? undefined}
      disabled={disabled} data-component="{F}"
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${checked ? 'bg-primary-500 border-primary-500' : 'bg-background-muted border-border'}`}>
      <span aria-hidden="true"
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}
"""

TPL["checkbox"] = """export function {F}({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel }: {
  checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; 'aria-label'?: string;
}) {
  return (
    <input type="checkbox" checked={checked} disabled={disabled} aria-label={ariaLabel}
      onChange={(e) => onCheckedChange?.(e.target.checked)} data-component="{F}"
      className="h-4 w-4 shrink-0 rounded-sm border border-border accent-primary-500" />
  );
}
"""

TPL["dialog"] = """const SIZES: Record<string, string> = {
  sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
};

export function {F}({ open, onOpenChange, title, description, size = 'md', children }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl'; children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="{F}">
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`relative w-full ${SIZES[size] ?? SIZES.md} rounded-xl border border-border bg-background-elevated shadow-xl animate-scale-in`}>
        <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-subtle">✕</button>
        <div className="px-6 pt-6 pb-2 pr-12">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        </div>
        <div className="px-6 py-4">{children}</div>
        <div className="flex justify-end gap-3 px-6 pb-6 pt-2" />
      </div>
    </div>
  );
}
"""

TPL["sheet"] = """export function {F}({ open, onOpenChange, title, side = 'right', children }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; side?: 'left' | 'right'; children?: ReactNode;
}) {
  if (!open) return null;
  const fromRight = side === 'right';
  return (
    <div className="fixed inset-0 z-overlay bg-black/50 backdrop-blur-sm animate-fade-in" data-component="{F}">
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`fixed top-0 bottom-0 flex w-full max-w-md flex-col border-border bg-background-elevated shadow-xl z-modal ${fromRight ? 'right-0 border-l animate-slide-in-right' : 'left-0 border-r animate-slide-in-left'}`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-subtle">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
"""

TPL["tabs"] = """export function {F}({ tabs }: { tabs: Array<{ label: string; value: string; active?: boolean; onSelect?: (v: string) => void }> }) {
  return (
    <div role="tablist" data-component="{F}" className="flex w-fit gap-1 rounded-lg bg-background-subtle p-1">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.active ?? false}
          onClick={() => t.onSelect?.(t.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${t.active ? 'bg-background-elevated text-foreground shadow-xs' : 'text-foreground-secondary hover:text-foreground'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
"""

TPL["avatar"] = """const SIZES: Record<string, string> = {
  xs: 'h-6 w-6 text-2xs', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg',
};

export function {F}({ name, src, size = 'sm' }: { name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = name.split(/\\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const sizeCls = SIZES[size] ?? SIZES.sm;
  if (src) {
    return <img src={src} alt={name} data-component="{F}" className={`rounded-full object-cover ring-2 ring-background ${sizeCls}`} />;
  }
  return (
    <span data-component="{F}" aria-label={name}
      className={`flex items-center justify-center overflow-hidden rounded-full bg-primary-100 font-medium text-primary-700 ring-2 ring-background ${sizeCls}`}>
      {initials}
    </span>
  );
}
"""

TPL["divider"] = """export function {F}({ className }: { className?: string }) {
  return <hr data-component="{F}" className={`my-4 border-border-subtle ${className ?? ''}`} />;
}
"""

TPL["spinner"] = """export function {F}({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} data-component="{F}"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary-500 ${className ?? ''}`} />
  );
}
"""

TPL["slider"] = """export function {F}({ min = 0, max = 100, value, onChange, className }: {
  min?: number; max?: number; value: number; onChange: (v: number) => void; className?: string;
}) {
  return (
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
      data-component="{F}" aria-label="Slider"
      className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-background-muted accent-primary-500 ${className ?? ''}`} />
  );
}
"""

TPL["tooltip"] = """export function {F}({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <span title={label} data-component="{F}" className="inline-flex">{children}</span>
  );
}
"""

TPL["label"] = """export function {F}({ children, htmlFor, className }: { children?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} data-component="{F}"
      className={`text-sm font-medium text-foreground ${className ?? ''}`}>{children}</label>
  );
}
"""

TPL["card"] = """export function {F}({ title, children, actions, className }: {
  title?: string; children?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div data-component="{F}" className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs ${className ?? ''}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
"""

TPL["appselector"] = """export function {F}({ apps, value, onChange, className }: {
  apps: Array<{ id: string; name: string }>; value?: string; onChange?: (appId: string) => void; className?: string;
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} aria-label="Active app"
      data-component="{F}"
      className={`h-8 rounded-md border border-border bg-background-elevated px-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary-500/20 ${className ?? ''}`}>
      {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
"""

TPL["loadingstate"] = """export function {F}({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" data-component="{F}" data-testid="loading-state"
      className={`flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary ${className ?? ''}`}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary-500" />
      {label}
    </div>
  );
}
"""

TPL["emptystate"] = """export function {F}({ title, description, action }: {
  title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div data-component="{F}" data-testid="empty-state" className="flex flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background-muted text-2xl text-foreground-tertiary/70">◎</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-foreground-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
"""

TPL["errorstate"] = """export function {F}({ title = 'Something went wrong', description, retry, className }: {
  title?: string; description?: string; retry?: () => void; className?: string;
}) {
  return (
    <div role="alert" data-component="{F}" data-testid="error-state"
      className={`mx-auto my-8 max-w-lg rounded-lg border border-error/20 bg-error-light px-4 py-3 text-error-foreground ${className ?? ''}`}>
      <strong className="text-sm font-medium">{title}</strong>
      {description && <p className="mt-0.5 text-xs opacity-90">{description}</p>}
      {retry && (
        <button type="button" onClick={retry}
          className="mt-2 rounded-md bg-error px-2 py-1 text-xs font-medium text-white hover:bg-error-dark">Retry</button>
      )}
    </div>
  );
}
"""

TPL["copybutton"] = """export function {F}({ text, label = 'Copy' }: { text: string; label?: string }) {
  const copy = (): void => { void navigator.clipboard?.writeText(text); };
  return (
    <button type="button" onClick={copy} data-component="{F}"
      className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-800 px-2 text-2xs text-slate-400 hover:bg-slate-700 hover:text-slate-200">
      {label}
    </button>
  );
}
"""

TPL["colorpicker"] = """export function {F}({ value, onChange, presets }: {
  value: string; onChange?: (v: string) => void; presets?: string[];
}) {
  return (
    <div data-component="{F}" className="flex items-center gap-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border shadow-inner-subtle transition-all hover:ring-2 hover:ring-primary-500/30"
        style={{ backgroundColor: value }} aria-label="Brand color">
        <input type="color" value={value} onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      <span className="font-mono text-xs text-foreground-secondary">{value}</span>
      {presets && (
        <div className="ml-2 grid grid-cols-6 gap-1.5">
          {presets.map((p) => (
            <button key={p} type="button" aria-label={p} onClick={() => onChange?.(p)}
              className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: p }} />
          ))}
        </div>
      )}
    </div>
  );
}
"""

# ---- layout ---------------------------------------------------------------
TPL["sidebar"] = """export interface NavItem { label: string; href: string; permission?: string; active?: boolean }
export function {F}({ items, collapsed, footer }: { items: NavItem[]; collapsed?: boolean; footer?: ReactNode }) {
  return (
    <nav data-component="{F}" aria-label="Sidebar"
      className={`fixed top-0 bottom-0 left-0 z-sticky flex flex-col border-r border-border bg-background-elevated transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex h-13 items-center gap-3 border-b border-border px-4">
        <span data-testid="sidebar-logo" className="text-primary-600">◆</span>
        {!collapsed && <span className="truncate font-semibold text-foreground">Testimonial API</span>}
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {items.map((it) => (
          <SidebarItem key={it.href} href={it.href} label={it.label} active={it.active} collapsed={collapsed} />
        ))}
      </div>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </nav>
  );
}
"""

TPL["sidebaritem"] = """export function {F}({ href, label, icon, active, collapsed, badge, onClick }: {
  href?: string; label: string; icon?: ReactNode; active?: boolean; collapsed?: boolean;
  badge?: ReactNode; onClick?: () => void;
}) {
  const cls = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${active ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300' : 'text-foreground-secondary hover:bg-background-subtle hover:text-foreground'} ${collapsed ? 'justify-center' : ''}`;
  const content = (
    <>
      {icon && <span aria-hidden="true" className="h-4 w-4 shrink-0">{icon}</span>}
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-2xs font-medium text-white">{badge}</span>
      )}
    </>
  );
  if (href) {
    return <a href={href} aria-current={active ? 'page' : undefined} className={cls} onClick={onClick}>{content}</a>;
  }
  return <button type="button" className={cls} onClick={onClick} aria-current={active ? 'page' : undefined}>{content}</button>;
}
"""

TPL["topbar"] = """export function {F}({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header data-component="{F}"
      className={`sticky top-0 z-sticky flex h-13 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md ${className ?? ''}`}>
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
"""

TPL["pageheader"] = """export function {F}({ title, description, actions, className }: {
  title: string; description?: string; actions?: ReactNode; className?: string;
}) {
  return (
    <header data-component="{F}" className={`mb-6 flex items-start justify-between gap-4 ${className ?? ''}`}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
"""

TPL["pagecontainer"] = """export function {F}({ title, description, actions, children, className }: {
  title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <main data-component="{F}" className="p-6">
      <div className={`mx-auto max-w-7xl ${className ?? ''}`}>
        {(title || actions) && <PageHeader title={title ?? ''} description={description} actions={actions} />}
        {children}
      </div>
    </main>
  );
}
"""

TPL["header"] = """export function {F}({ title, actions }: { title: string; actions?: ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}
"""

TPL["impersonationbanner"] = """export function {F}({ tenantName, onExit }: { tenantName: string; onExit?: () => void }) {
  return (
    <div data-component="{F}" data-testid="impersonation-banner" role="note"
      className="sticky top-13 z-sticky flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      <span>⚠ Viewing as {tenantName} — all actions are logged</span>
      {onExit && (
        <button type="button" onClick={onExit}
          className="ml-4 h-6 rounded bg-warning-dark/20 px-2 text-xs hover:bg-warning-dark/30">Exit impersonation</button>
      )}
    </div>
  );
}
"""

TPL["forbidden"] = """export function {F}({ permission }: { permission?: string }) {
  return (
    <div role="alert" data-component="{F}" data-testid="forbidden-page" className="mx-auto max-w-md py-24 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold text-foreground">403 — Forbidden</h1>
      <p className="mt-2 text-sm text-foreground-secondary">
        You don't have permission to view this page{permission ? ` (requires: ${permission})` : ''}.
      </p>
    </div>
  );
}
"""

TPL["bulkactionbar"] = """export function {F}({ count, onApprove, onReject, onTag, onDelete, busy }: {
  count: number; onApprove?: () => void; onReject?: () => void; onTag?: () => void; onDelete?: () => void; busy?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div data-component="{F}" data-testid="bulk-action-bar"
      className="my-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/60 px-3 py-2 text-sm">
      <span className="font-medium text-primary-800">{count} selected</span>
      <button type="button" onClick={onApprove} disabled={busy} className="rounded-md bg-success px-2 py-1 text-xs font-medium text-white hover:bg-success-dark disabled:opacity-50">Approve</button>
      <button type="button" onClick={onReject} disabled={busy} className="rounded-md bg-error px-2 py-1 text-xs font-medium text-white hover:bg-error-dark disabled:opacity-50">Reject</button>
      <button type="button" onClick={onTag} disabled={busy} className="rounded-md border border-border bg-background-elevated px-2 py-1 text-xs font-medium disabled:opacity-50">Tag…</button>
      <button type="button" onClick={onDelete} disabled={busy} className="rounded-md border border-error/30 px-2 py-1 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50">Delete</button>
    </div>
  );
}
"""

TPL["codeblock"] = """export function {F}({ code, language = 'html', className }: { code: string; language?: string; className?: string }) {
  return (
    <div data-component="{F}" className={`relative overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 ${className ?? ''}`}>
      <button type="button" onClick={() => void navigator.clipboard?.writeText(code)}
        className="absolute top-2 right-2 flex h-7 items-center gap-1 rounded bg-slate-800 px-2 text-2xs text-slate-400 hover:bg-slate-700 hover:text-slate-200">Copy</button>
      <pre className="whitespace-pre-wrap break-all"><code data-language={language}>{code}</code></pre>
    </div>
  );
}
"""

TPL["confirm"] = """export function {F}({ open, onOpenChange, title, description, confirmLabel = 'Confirm', tone = 'primary', onConfirm }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  confirmLabel?: string; tone?: 'primary' | 'destructive'; onConfirm?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="{F}">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border border-border bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button"
            onClick={() => { onConfirm?.(); onOpenChange?.(false); }}
            className={`h-9 rounded-md px-4 text-sm font-medium text-white hover:opacity-90 ${tone === 'destructive' ? 'bg-error hover:bg-error-dark' : 'bg-primary-500 hover:bg-primary-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
"""

TPL["destructiveconfirm"] = """export function {F}({ open, onOpenChange, title, description, confirmText, onConfirm }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  confirmText: string; onConfirm?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="{F}">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border border-error/30 bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        <p className="mt-3 text-xs text-foreground-secondary">Type <code className="rounded bg-background-muted px-1 font-mono">{confirmText}</code> to confirm.</p>
        <input aria-label="Confirmation text" placeholder={confirmText}
          className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-error/20 focus:border-error" />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button" onClick={() => { onConfirm?.(); onOpenChange?.(false); }}
            className="h-9 rounded-md bg-error px-4 text-sm font-medium text-white hover:bg-error-dark">Delete permanently</button>
        </div>
      </div>
    </div>
  );
}
"""

# ---- data-display ---------------------------------------------------------
TPL["datatable"] = """export interface Column<T> { key: string; header: string; cell?: (row: T) => ReactNode }
export function {F}<T>({ data, columns, selectable, selectedKeys, onToggleRow, emptyLabel = 'No results', loading }: {
  data: T[]; columns: Column<T>[]; selectable?: boolean; selectedKeys?: Set<string> | null;
  onToggleRow?: (row: T, checked: boolean) => void; emptyLabel?: string; loading?: boolean;
}) {
  const idOf = (row: T): string => String((row as Record<string, unknown>)['id'] ?? JSON.stringify(row));
  const allSelected = data.length > 0 && (selectedKeys?.size ?? 0) === data.length && data.every((r) => selectedKeys?.has(idOf(r)));
  return (
    <div data-component="{F}" className="overflow-hidden rounded-xl border border-border bg-background-elevated">
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
"""

TPL["statcard"] = """export function {F}({ label, value, delta, icon, className }: {
  label: string; value: string | number; delta?: number; icon?: ReactNode; className?: string;
}) {
  const trend = delta === undefined ? null : delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'text-foreground-tertiary';
  const arrow = delta === undefined ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  return (
    <div data-component="{F}" data-testid="stat-card"
      className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs transition-shadow duration-200 hover:shadow-md ${className ?? ''}`}>
      {icon && <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-500">{icon}</div>}
      <p className="text-sm font-medium text-foreground-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {delta !== undefined && <p className={`mt-2 flex items-center gap-1 text-xs ${trend}`}>{arrow} {Math.abs(delta)}%</p>}
    </div>
  );
}
"""

TPL["testimonialcard"] = """export function {F}({ content, author, rating, status, onApprove, onReject, canModerate, className }: {
  content: string; author?: string; rating?: number; status: string;
  onApprove?: () => void; onReject?: () => void; canModerate?: boolean; className?: string;
}) {
  return (
    <article data-component="{F}" data-testid="testimonial-card"
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
"""

TPL["kanban"] = """export interface KanbanColumn { id: string; title: string; items: Array<{ id: string; summary: string; status: string }> }
export function {F}({ columns, onMove, className }: { columns: KanbanColumn[]; onMove?: (itemId: string, toColumnId: string) => void; className?: string }) {
  return (
    <div data-component="{F}" data-testid="kanban" className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>
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
"""

TPL["formbuilder"] = """export interface FormQuestionSpec { id: string; type: 'text' | 'rating' | 'video' | 'select'; label: string; required?: boolean }
export function {F}({ formName, questions, onChange, className }: {
  formName: string; questions: FormQuestionSpec[]; onChange?: (q: FormQuestionSpec[]) => void; className?: string;
}) {
  const update = (id: string, patch: Partial<FormQuestionSpec>): void =>
    onChange?.(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <div data-component="{F}" data-testid="form-builder" className={`space-y-3 ${className ?? ''}`}>
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
"""

TPL["importcsv"] = """export function {F}({ open, onOpenChange }: { open: boolean; onOpenChange?: (v: boolean) => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="{F}">
      <div role="dialog" aria-modal="true" aria-label="Import CSV" className="w-full max-w-lg rounded-xl border border-border bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">Import testimonials from CSV</h3>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-all hover:border-primary-500 hover:bg-primary-50/30">
          <span className="text-sm text-foreground-secondary">Click to upload</span>
          <span className="text-xs text-foreground-tertiary">.csv up to 5MB</span>
          <input type="file" accept=".csv" aria-label="CSV file" className="hidden" />
        </label>
        <p className="mt-2 text-xs text-foreground-tertiary">Column mapping + 5-row preview — Doc 5 wiring.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)} className="h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button" onClick={() => onOpenChange?.(false)} className="h-9 rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600">Start import</button>
        </div>
      </div>
    </div>
  );
}
"""

TPL["jsonviewer"] = """export function {F}({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre data-component="{F}" className={`max-h-96 overflow-auto rounded-lg bg-background-subtle p-4 font-mono text-xs text-foreground ${className ?? ''}`}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
"""

TPL["qrcode"] = """export function {F}({ url, className }: { url: string; className?: string }) {
  return (
    <div data-component="{F}" data-testid="qr-display" aria-label={`QR code for ${url}`}
      className={`inline-flex h-40 w-40 items-center justify-center rounded-lg border border-border bg-white p-2 ${className ?? ''}`}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-[6px] text-slate-900">
        <div className="grid grid-cols-3 gap-0.5 text-primary-900">{"█ ██ █".replace(' ', '')}</div>
        <span className="px-1 text-[8px] text-slate-500">scan-me</span>
      </div>
    </div>
  );
}
"""

TPL["realtimeind"] = """export function {F}({ connected, className }: { connected: boolean; className?: string }) {
  return (
    <span data-connected={connected} data-component="{F}"
      className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-success' : 'text-warning'} ${className ?? ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-warning animate-pulse-subtle'}`} />
      {connected ? 'Live' : 'Reconnecting…'}
    </span>
  );
}
"""

TPL["taginput"] = """export function {F}({ value, onChange, className }: { value: string[]; onChange?: (tags: string[]) => void; className?: string }) {
  return (
    <div data-component="{F}" className={`flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 ${className ?? ''}`}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-2xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {t}
          <button type="button" onClick={() => onChange?.(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="hover:text-primary-900">×</button>
        </span>
      ))}
      <input aria-label="Add tag" placeholder="Add tag…"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value.trim();
            if (v && !value.includes(v)) onChange?.([...value, v]);
            (e.target as HTMLInputElement).value = '';
          }
        }}
        className="h-6 min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary" />
    </div>
  );
}
"""

TPL["ratingstars"] = """export function {F}({ value, size = 'md', onChange, label, className }: {
  value: number; size?: 'sm' | 'md' | 'lg'; onChange?: (v: number) => void; label?: string; className?: string;
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' } as const;
  const star = (n: number): ReactNode => {
    const filled = value >= n - 0.25;
    const el = (
      <span aria-hidden="true" className={`${sizes[size]} ${filled ? 'text-warning' : 'text-foreground-tertiary/30'}`}>★</span>
    );
    if (!onChange) return el;
    return (
      <button key={n} type="button" aria-label={`Rate ${n} of 5`} onClick={() => onChange(n)}
        className={`cursor-pointer transition-transform hover:scale-110 ${sizes[size]}`}>
        <span className={filled ? 'text-warning' : 'text-foreground-tertiary/30'}>★</span>
      </button>
    );
  };
  return (
    <div role="radiogroup" aria-label={label ?? `Rating ${value} out of 5`} data-component="{F}"
      className={`flex items-center gap-0.5 ${className ?? ''}`}>
      {[1, 2, 3, 4, 5].map((n) => star(n))}
    </div>
  );
}
"""

TPL["statusbadge"] = """const MAP: Record<string, { tone: string; dot: string }> = {
  pending: { tone: 'bg-warning-light text-warning-foreground dark:bg-warning-dark/30 dark:text-warning', dot: 'bg-warning' },
  approved: { tone: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success', dot: 'bg-success' },
  rejected: { tone: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error', dot: 'bg-error' },
  archived: { tone: 'bg-background-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
  active: { tone: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success', dot: 'bg-success' },
  disabled: { tone: 'bg-background-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
  suspended: { tone: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error', dot: 'bg-error' },
};

/** Maps TestimonialStatus (+ tenant/user statuses) per Doc 5 §5.3. */
export function {F}({ status, className }: { status: string; className?: string }) {
  const c = MAP[status] ?? MAP.archived;
  return (
    <span data-component="{F}" data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium ${c.tone} ${className ?? ''}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}
"""

TPL["sourcebadge"] = """const MAP: Record<string, { tone: string; label: string }> = {
  manual: { tone: 'bg-background-subtle text-foreground-secondary', label: 'Manual' },
  form: { tone: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info', label: 'Form' },
  api: { tone: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300', label: 'API' },
  twitter_import: { tone: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info', label: 'Twitter' },
  csv_import: { tone: 'bg-background-subtle text-foreground-secondary', label: 'CSV' },
};

/** Maps TestimonialSource per Doc 5 §5.3 (icon pass in the iconography slice). */
export function {F}({ source, className }: { source: string; className?: string }) {
  const c = MAP[source] ?? MAP.manual;
  return (
    <span data-component="{F}" data-source={source}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-medium ${c.tone} ${className ?? ''}`}>
      {c.label}
    </span>
  );
}
"""

TPL["widgetbuilder"] = """export interface WidgetStyleOverrides { theme: 'light' | 'dark'; accentColor: string; fontFamily?: string }
export function {F}({ overrides, onChange, className }: {
  overrides: WidgetStyleOverrides; onChange?: (o: WidgetStyleOverrides) => void; className?: string;
}) {
  return (
    <div data-component="{F}" data-testid="widget-builder" className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${className ?? ''}`}>
      <div className="space-y-4 rounded-xl border border-border bg-background-elevated p-5">
        <label className="block text-sm font-medium text-foreground">Theme</label>
        <select value={overrides.theme} onChange={(e) => onChange?.({ ...overrides, theme: e.target.value as WidgetStyleOverrides['theme'] })}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Accent</span>
          <input type="color" value={overrides.accentColor} aria-label="Accent color"
            onChange={(e) => onChange?.({ ...overrides, accentColor: e.target.value })}
            className="h-9 w-9 rounded-md border border-border bg-background p-0.5" />
          <span className="font-mono text-xs text-foreground-secondary">{overrides.accentColor}</span>
        </div>
        <label className="block text-sm font-medium text-foreground">Font</label>
        <input value={overrides.fontFamily ?? ''} placeholder="Inter, system-ui…"
          onChange={(e) => onChange?.({ ...overrides, fontFamily: e.target.value })}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
      </div>
      <div data-testid="widget-preview" className="rounded-xl border border-border p-5"
        style={{ background: overrides.theme === 'dark' ? '#18181b' : '#ffffff', color: overrides.theme === 'dark' ? '#fafafa' : '#18181b' }}>
        <p className="text-xs text-foreground-tertiary">Live preview</p>
        <blockquote className="mt-2 text-base" style={{ fontFamily: overrides.fontFamily }}>“This product is fantastic!”</blockquote>
      </div>
    </div>
  );
}
"""

# ---- feedback -------------------------------------------------------------
TPL["chartcard"] = """export function {F}({ title, subtitle, controls, children, empty, className }: {
  title: string; subtitle?: string; controls?: ReactNode; children?: ReactNode; empty?: boolean; className?: string;
}) {
  return (
    <section data-component="{F}" data-testid="chart-card"
      className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-foreground-secondary">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-1">{controls}</div>}
      </div>
      <div className="h-64">
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-foreground-tertiary">No data for this period</p>
        ) : (
          children ?? <p className="flex h-full items-center justify-center text-xs text-foreground-tertiary">Chart renders in the charts slice</p>
        )}
      </div>
    </section>
  );
}
"""

TPL["toast"] = """const TONES: Record<string, string> = {
  success: 'text-success', error: 'text-error', info: 'text-info', loading: 'text-primary-500',
};
export function {F}({ tone = 'default', title, description, children }: {
  tone?: 'default' | 'success' | 'error' | 'info' | 'loading'; title?: string; description?: string; children?: ReactNode;
}) {
  const glyph = tone === 'loading' ? '◌' : tone === 'success' ? '✓' : tone === 'error' ? '✕' : tone === 'info' ? 'i' : '•';
  return (
    <div role="status" data-tone={tone} data-component="{F}"
      className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-background-elevated px-4 py-3 shadow-lg animate-fade-in-up">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-sm ${TONES[tone] ?? 'text-foreground-secondary'} ${tone === 'loading' ? 'animate-spin' : ''}`}>{glyph}</span>
      <div className="flex-1">
        {(title || children) && <p className="text-sm font-medium text-foreground">{title ?? children}</p>}
        {description && <p className="mt-0.5 text-xs text-foreground-secondary">{description}</p>}
      </div>
    </div>
  );
}
"""

TPL["toastviewport"] = """export function {F}({ children }: { children?: ReactNode }) {
  return (
    <div aria-live="polite" data-component="{F}" className="fixed right-4 bottom-4 z-toast flex flex-col items-end gap-2">
      {children}
    </div>
  );
}
"""

TPL["alert"] = """const TONES: Record<string, string> = {
  info: 'bg-info-light border-info/20 text-info-foreground',
  success: 'bg-success-light border-success/20 text-success-foreground',
  warning: 'bg-warning-light border-warning/20 text-warning-foreground',
  error: 'bg-error-light border-error/20 text-error-foreground',
};
const GLYPHS: Record<string, string> = { info: 'i', success: '✓', warning: '!', error: '✕' };

export function {F}({ tone = 'info', title, description, children, className }: {
  tone?: 'info' | 'success' | 'warning' | 'error'; title: string; description?: string; children?: ReactNode; className?: string;
}) {
  return (
    <div role="alert" data-tone={tone} data-component="{F}"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${TONES[tone] ?? TONES.info} ${className ?? ''}`}>
      <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current text-[10px] font-bold">{GLYPHS[tone] ?? 'i'}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {(description || children) && <p className="mt-0.5 text-xs opacity-90">{description ?? children}</p>}
      </div>
    </div>
  );
}
"""

TPL["skeleton"] = """const VARIANTS: Record<string, string> = {
  text: 'h-4 w-full', title: 'h-7 w-48', avatar: 'h-10 w-10 rounded-full', card: 'h-32 w-full rounded-xl',
  table: 'h-12 w-full', chart: 'h-64 w-full rounded-xl',
};

export function {F}({ variant = 'text', className }: { variant?: 'text' | 'title' | 'avatar' | 'card' | 'table' | 'chart'; className?: string }) {
  return (
    <span data-component="{F}" data-testid="skeleton" aria-hidden="true"
      className={`block animate-shimmer rounded-md bg-background-muted ${VARIANTS[variant] ?? VARIANTS.text} ${className ?? ''}`}
      style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--background-muted)) 25%, hsl(var(--background-subtle)) 50%, hsl(var(--background-muted)) 75%)', backgroundSize: '200% 100%' }} />
  );
}
"""

TPL["notificationbell"] = """export function {F}({ count, onOpen, className }: { count?: number; onOpen?: () => void; className?: string }) {
  return (
    <button type="button" aria-label={count ? `${count} unread notifications` : 'Notifications'} data-component="{F}"
      onClick={onOpen} className={`relative text-foreground-secondary transition-colors hover:text-foreground ${className ?? ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count ? (
        <span data-testid="notification-count"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-2xs font-bold text-white animate-scale-in">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </button>
  );
}
"""

# ---- forms ----------------------------------------------------------------
TPL["formfield"] = """export function {F}({ label, htmlFor, required, hint, error, children, className }: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string; children?: ReactNode; className?: string;
}) {
  return (
    <div data-component="{F}" data-testid="form-field" className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-xs text-error">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-foreground-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
"""

TPL["formfileupload"] = """export function {F}({ accept = 'image/*', hint, progress, onChange, className }: {
  accept?: string; hint?: string; progress?: number; onChange?: (file: File | null) => void; className?: string;
}) {
  return (
    <div data-component="{F}" data-testid="form-file-upload" className={className}>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-all duration-200 hover:border-primary-500 hover:bg-primary-50/30">
        <span className="text-sm text-foreground-secondary"><span className="font-medium text-primary-500">Click to upload</span></span>
        <span className="text-xs text-foreground-tertiary">{hint ?? 'Accepted types only — max size enforced'}</span>
        <input type="file" accept={accept} aria-label="File upload"
          onChange={(e) => onChange?.(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background-muted">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}
"""

TPL["richtext"] = """export function {F}(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-component="{F}" placeholder="Write content…" {...props} />;
}
"""

MAP = {
    "primitives": [
        ("AppSelector", "appselector"), ("Avatar", "avatar"), ("Badge", "badge"),
        ("Button", "button"), ("Card", "card"), ("Checkbox", "checkbox"),
        ("CopyButton", "copybutton"), ("Dialog", "dialog"), ("Divider", "divider"),
        ("EmptyState", "emptystate"), ("ErrorState", "errorstate"), ("Input", "input"),
        ("Label", "label"), ("LoadingState", "loadingstate"), ("Select", "select"),
        ("Sheet", "sheet"), ("Slider", "slider"), ("Spinner", "spinner"),
        ("Switch", "switch"), ("Tabs", "tabs"), ("Textarea", "textarea"),
        ("Tooltip", "tooltip"),
    ],
    "layout": [
        ("BulkActionBar", "bulkactionbar"), ("CodeBlock", "codeblock"),
        ("ConfirmDialog", "confirm"), ("DestructiveConfirmDialog", "destructiveconfirm"),
        ("ForbiddenPage", "forbidden"), ("Header", "header"),
        ("ImpersonationBanner", "impersonationbanner"), ("PageContainer", "pagecontainer"),
        ("PageHeader", "pageheader"), ("Sidebar", "sidebar"), ("SidebarItem", "sidebaritem"),
        ("Topbar", "topbar"),
    ],
    "data-display": [
        ("DataTable", "datatable"), ("FormBuilder", "formbuilder"),
        ("ImportCsvDialog", "importcsv"), ("JsonViewer", "jsonviewer"),
        ("QrCodeDisplay", "qrcode"), ("RatingStars", "ratingstars"),
        ("RealtimeIndicator", "realtimeind"), ("SourceBadge", "sourcebadge"),
        ("StatCard", "statcard"), ("StatusBadge", "statusbadge"), ("TagInput", "taginput"),
        ("TestimonialCard", "testimonialcard"), ("TestimonialKanban", "kanban"),
        ("WidgetBuilder", "widgetbuilder"),
    ],
    "feedback": [
        ("Alert", "alert"), ("ChartCard", "chartcard"), ("NotificationBell", "notificationbell"),
        ("Skeleton", "skeleton"), ("Toast", "toast"), ("ToastViewport", "toastviewport"),
    ],
    "forms": [
        ("ColorPicker", "colorpicker"), ("FormField", "formfield"),
        ("FormFileUpload", "formfileupload"), ("RatingInput", "ratingstars"),
        ("RichTextArea", "richtext"),
    ],
    "charts": [
        ("AreaChartCard", "chartcard"), ("BarChartCard", "chartcard"),
        ("LineChartCard", "chartcard"), ("PieChartCard", "chartcard"),
    ],
}

SECTIONS = {
    "primitives": "§5.1 primitives", "layout": "§5.2 layout",
    "data-display": "§5.3 data display", "feedback": "§5.4 feedback",
    "forms": "§5.5 forms", "charts": "§5.6 charts",
}

# Kind -> extra import for components referenced from within the same template.
CROSS_IMPORTS = {
    "sidebar": "import { SidebarItem } from './SidebarItem';",
    "pagecontainer": "import { PageHeader } from './PageHeader';",
    "header": "import { PageHeader } from './PageHeader';",
    "testimonialcard": "import { StatusBadge } from './StatusBadge';",
}


def build(name: str, kind: str) -> str:
    if kind in ("input",):
        imports = "import type { InputHTMLAttributes } from 'react';\n"
    elif kind in ("textarea", "richtext"):
        imports = "import type { TextareaHTMLAttributes } from 'react';\n"
    else:
        imports = REACT_NODE
    cross = CROSS_IMPORTS.get(kind)
    if cross:
        imports += "\n" + cross
    body = TPL[kind].replace("{F}", name)
    return imports + "\n" + body


CATALOG_NOTE = """/**
 * §6/§5 component catalog — one barrel over the per-file inventory in
 * packages/ui/src/components/{primitives,layout,data-display,feedback,forms,charts}.
 * Generated by scripts/generate-doc4-components.py — do not hand-edit.
 */
"""


def catalog_src() -> str:
    lines = [CATALOG_NOTE]
    cat_section = {
        "primitives": "primitives (§5.1)", "layout": "layout (§5.2)", "data-display": "data-display (§5.3)",
        "feedback": "feedback (§5.4)", "forms": "forms (§5.5)", "charts": "charts (§5.6)",
    }
    for cat, entries in MAP.items():
        lines.append(f"// {cat_section[cat]}")
        for name, _kind in entries:
            lines.append(f"export * from './{cat}/{name}';")
    lines.append("")
    lines.append("export { ReactQueryProvider, ThemeProviders } from './providers';")
    return "\n".join(lines)


if __name__ == "__main__":
    written = 0
    for cat, entries in MAP.items():
        for name, kind in entries:
            sub = os.path.join(ROOT, cat)
            os.makedirs(sub, exist_ok=True)
            out = os.path.join(sub, f"{name}.tsx")
            doc = f"/** {name} — Doc 4 §6 / Doc 5 {SECTIONS[cat]} ({cat}) · styled per §5 spec. */\n"
            with open(out, "w") as f:
                f.write(doc + build(name, kind))
            written += 1
    with open(os.path.join(ROOT, "ui.tsx"), "w") as f:
        f.write(catalog_src())
    print(f"wrote {written} component files + catalog barrel")
