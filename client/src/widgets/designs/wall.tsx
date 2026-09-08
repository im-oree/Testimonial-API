/** Wall of love — masonry columns, "Loved by customers" wall style. */
import type { WidgetDesignProps } from '../types';
import { Avatar, CtaRow, StarsInline, timeLabel, WidgetEmpty, fontStack } from '../primitives';

export default function WallWidget({ items, tokens, cta }: WidgetDesignProps) {
  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;
  return (
    <div style={{ fontFamily: fontStack(tokens.font) }}>
      <div className="wdg-masonry">
        {items.map((it) => (
          <figure
            key={it.id}
            className="wdg-masonry-item wdg-hover"
            style={{
              margin: 0,
              background: '#fff',
              border: '1px solid #ececf3',
              borderRadius: tokens.radiusPx,
              padding: 16,
              breakInside: 'avoid',
              transition: 'box-shadow .18s ease, transform .18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Avatar item={it} tokens={tokens} size={30} />
              <span style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.authorName}</span>
            </div>
            <StarsInline rating={it.rating} />
            <blockquote style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#33384d' }}>“{it.content}”</blockquote>
            <figcaption style={{ marginTop: 8, fontSize: 11, color: '#9aa0b0' }}>{timeLabel(it.createdAt)}</figcaption>
          </figure>
        ))}
      </div>
      <CtaRow cta={cta} tokens={tokens} align="center" />
    </div>
  );
}