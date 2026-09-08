/**
 * Shared widget primitives — the pieces every design is built from so the
 * "things every widget should have" stay consistent: author picture (with
 * initials fallback), name, rating, message and time. Designs only arrange
 * them differently.
 */
import { RatingStars } from '../components/ui';
import { IconStar } from '../components/icons';
import type { ThemeFontId } from '../lib/types';
import type { WidgetCta, WidgetItem, WidgetTokens } from './types';

export function fontStack(font: ThemeFontId | undefined): string {
  switch (font) {
    case 'serif':
      return "Georgia, 'Times New Roman', serif";
    case 'mono':
      return "'SFMono-Regular', Menlo, Consolas, monospace";
    default:
      return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  }
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function Avatar({ item, tokens, size = 44 }: { item: WidgetItem; tokens: WidgetTokens; size?: number }) {
  if (item.avatarUrl) {
    return (
      <img
        src={item.avatarUrl}
        alt={item.authorName}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: tokens.soft }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(140deg, ${tokens.primary}, ${tokens.accent})`,
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        flex: 'none',
      }}
    >
      {initialsOf(item.authorName)}
    </span>
  );
}

export function Stars({ rating, size = 'sm' }: { rating: number | null; size?: 'sm' | 'md' }) {
  if (!rating) return null;
  return <RatingStars value={rating} size={size} />;
}

export function StarsInline({ rating, size = 15 }: { rating: number | null; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: '#f5b400', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} size={size} style={{ opacity: n <= (rating ?? 0) ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

/** Empty state — designs share it so an empty wall never looks broken. */
export function WidgetEmpty({ tokens, cta }: { tokens: WidgetTokens; cta?: WidgetCta | null }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '44px 20px',
        borderRadius: tokens.radiusPx,
        background: '#fff',
        border: `1px dashed ${tokens.primary}55`,
        fontFamily: 'inherit',
      }}
    >
      <IconStar size={30} style={{ color: tokens.primary, opacity: 0.6 }} />
      <h3 style={{ margin: '10px 0 4px', color: tokens.primary, fontFamily: 'inherit' }}>No reviews yet</h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Be the first to share your experience — it takes less than a minute.</p>
      {cta && (
        <a
          href={cta.href}
          style={{
            display: 'inline-block',
            marginTop: 16,
            padding: '9px 16px',
            borderRadius: 8,
            background: tokens.primary,
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}

export function CtaRow({ cta, tokens, align = 'center' }: { cta?: WidgetCta | null; tokens: WidgetTokens; align?: 'center' | 'right' }) {
  if (!cta) return null;
  return (
    <div style={{ textAlign: align, marginTop: 14 }}>
      <a
        href={cta.href}
        style={{
          display: 'inline-block',
          padding: '9px 16px',
          borderRadius: 8,
          background: tokens.primary,
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {cta.label}
      </a>
    </div>
  );
}
