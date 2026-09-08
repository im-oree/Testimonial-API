/** SidebarItem — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function SidebarItem({ href, label, icon, active, collapsed, badge, onClick }: {
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
