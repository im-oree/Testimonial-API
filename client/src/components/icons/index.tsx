/**
 * Zojatech icon library — every glyph in the product comes from here. No
 * emoji anywhere. Each icon is a hand-drawn 24x24 stroke SVG (1.8px, round
 * caps/joins) that inherits `currentColor` so it tints with surrounding text,
 * theme tokens and button states automatically.
 *
 * Usage: <IconCheck size={14} className="x" /> — size defaults to 1em so the
 * icon scales with its text.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

function Svg({ size = '1em', className, style, title, children, filled = false }: IconProps & { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={className}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l4.6 4.6L19.5 7" />
    </Svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3v5h-5" />
    </Svg>
  );
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 4.5H19.5V10.5" />
      <path d="M19.5 4.5L10.5 13.5" />
      <path d="M19.5 13v5.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1H11" />
    </Svg>
  );
}

export function IconStar(p: IconProps) {
  return (
    <Svg {...p} filled>
      <path d="M12 2.9l2.72 5.51 6.08.88-4.4 4.29 1.04 6.05L12 16.9l-5.44 2.86 1.04-6.05-4.4-4.29 6.08-.88L12 2.9z" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9.5l6 5.5 6-5.5" />
    </Svg>
  );
}

export function IconCode(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 6.5L3.5 12l5 5.5" />
      <path d="M15.5 6.5l5 5.5-5 5.5" />
    </Svg>
  );
}

export function IconPalette(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.6 0 2.2-.9 2.2-1.9 0-.9-.6-1.5-.6-2.2 0-1 .9-1.7 2-1.7h2.1A4.3 4.3 0 0 0 22 10.5C22 6.6 17.5 3.5 12 3.5z" />
      <circle cx="7.6" cy="10.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7.2" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.5 19.6c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7" />
      <path d="M15.6 5.6a3 3 0 0 1 0 5.3" />
      <path d="M17.4 15.3c1.7.7 2.8 2 3.2 4.3" />
    </Svg>
  );
}

export function IconClipboard(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V3.8a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
      <path d="M9 10.5h6M9 14h6M9 17.5h3.5" />
    </Svg>
  );
}

export function IconLayers(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5L21 8.5l-9 5-9-5 9-5z" />
      <path d="M4 12.5l8 4.4 8-4.4" />
      <path d="M4 16l8 4.4 8-4.4" />
    </Svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11.2L12 4l8 7.2" />
      <path d="M6 10v9.5h12V10" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20l4.2-1 11-11a2 2 0 0 0-2.8-2.8l-11 11L4 20z" />
      <path d="M13.5 6.6l3.9 3.9" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5h15" />
      <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" />
      <path d="M6.2 6.5l.9 12a2 2 0 0 0 2 1.9h5.8a2 2 0 0 0 2-1.9l.9-12" />
    </Svg>
  );
}

/** Zojatech monogram used as a brand/logo fallback mark. */
export function IconBrand(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.2l7.3 4.2v8.4L12 20l-7.3-4.2V7.4L12 3.2z" />
      <path d="M8.6 15V9.4l3.2 3.4 3.2-3.4V15" />
    </Svg>
  );
}
