/** Sidebar — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

import { SidebarItem } from './SidebarItem';
export interface NavItem { label: string; href: string; permission?: string; active?: boolean }
export function Sidebar({ items, collapsed, footer }: { items: NavItem[]; collapsed?: boolean; footer?: ReactNode }) {
  return (
    <nav data-component="Sidebar" aria-label="Sidebar"
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
