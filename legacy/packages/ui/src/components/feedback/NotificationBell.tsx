/** NotificationBell — Doc 4 §6 / Doc 5 §5.4 feedback (feedback) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function NotificationBell({ count, onOpen, className }: { count?: number; onOpen?: () => void; className?: string }) {
  return (
    <button type="button" aria-label={count ? `${count} unread notifications` : 'Notifications'} data-component="NotificationBell"
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
