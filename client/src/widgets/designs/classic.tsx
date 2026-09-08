/** Classic — clean card grid: avatar, stars, message, name/date. */
import type { WidgetDesignProps } from '../types';
import { Avatar, CtaRow, StarsInline, timeLabel, WidgetEmpty, fontStack } from '../primitives';

export default function ClassicWidget({ items, tokens, cta }: WidgetDesignProps) {
  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
          fontFamily: fontStack(tokens.font),
        }}
      >
        {items.map((it) => (
          <article
            key={it.id}
            className="wdg-hover"
            style={{
              background: '#fff',
              border: '1px solid #ececf3',
              borderRadius: tokens.radiusPx,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'box-shadow .18s ease, transform .18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar item={it} tokens={tokens} size={42} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#161a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.authorName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StarsInline rating={it.rating} />
                  <span style={{ fontSize: 11, color: '#9aa0b0' }}>{timeLabel(it.createdAt)}</span>
                </div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#33384d', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {it.content}
            </p>
          </article>
        ))}
      </div>
      <CtaRow cta={cta} tokens={tokens} align="center" />
    </div>
  );
}