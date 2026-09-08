/**
 * Public testimonial wall — no login needed. Shows a product's approved
 * reviews using the product's chosen widget design (from the plug-and-play
 * library) with a CTA to the public form.
 *
 * Two modes:
 *   · Full page   — brand header, review count + average, then the design.
 *   · ?embed=1    — widget-only surface used inside the <iframe> created by
 *                   /widget/embed.js. No chrome, transparent background, and
 *                   it posts its rendered height to the parent so embeds are
 *                   never cropped (auto-height iframes).
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { PublicWall } from '../lib/types';
import { DEFAULT_WIDGET_DESIGN, getWidgetDesign, type WidgetItem, type WidgetTokens } from '../widgets';
import { WidgetEmpty } from '../widgets/primitives';
import { ErrorBanner, RatingStars } from '../components/ui';
import { FONT_OPTIONS } from '../lib/theme';

function useEmbedHeight(enabled: boolean, ready: boolean): void {
  useEffect(() => {
    if (!enabled || !ready) return;
    const send = () => {
      const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      window.parent.postMessage({ zojatech: { height: h } }, '*');
    };
    send();
    const t = window.setTimeout(send, 150);
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    window.addEventListener('resize', send);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', send);
      ro.disconnect();
    };
  }, [enabled, ready]);
}

export default function WallPage() {
  const { appSlug = '' } = useParams();
  const [wall, setWall] = useState<PublicWall | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = new URLSearchParams(window.location.search);
  const embed = q.get('embed') === '1';

  useEffect(() => {
    let alive = true;
    setError(null);
    setWall(null);
    api
      .get<PublicWall>(`/v1/public/walls/${appSlug}`)
      .then((w) => {
        if (alive) setWall(w);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Wall not found.');
      });
    return () => {
      alive = false;
    };
  }, [appSlug]);

  useEmbedHeight(embed, Boolean(wall));

  if (error) {
    return (
      <div className="wall">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!wall) {
    return (
      <div className="wall">
        <div className="block-center">
          <span className="spinner spinner-lg" aria-hidden />
        </div>
      </div>
    );
  }

  const count = wall.testimonials.length;
  const rated = wall.testimonials.filter((t) => t.rating);
  const avgRating = rated.length ? Math.round((rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length) * 10) / 10 : null;

  // DOC-7 theme: pre-resolved tokens from the API; falls back to the classic
  // look for older payloads.
  const th = wall.theme;
  const vars = {
    '--brand': th?.primary ?? wall.brandColor,
    '--accent': th?.accent ?? '#0ea5a0',
    '--radius': th ? `${th.radiusPx}px` : '14px',
    '--font-stack': FONT_OPTIONS.find((f) => f.id === th?.font)?.stack ?? 'inherit',
  } as React.CSSProperties;

  const designId = (q.get('design') || wall.design || DEFAULT_WIDGET_DESIGN).trim();
  const { meta, component: Widget } = getWidgetDesign(designId);
  const tokens: WidgetTokens = {
    primary: th?.primary ?? wall.brandColor,
    soft: th?.soft ?? '#e0f5f4',
    accent: th?.accent ?? '#0ea5a0',
    radiusPx: th?.radiusPx ?? 14,
    font: th?.font ?? 'system',
  };
  const items: WidgetItem[] = wall.testimonials.map((t) => ({
    id: t.id,
    content: t.content,
    authorName: t.authorName ?? 'Anonymous visitor',
    rating: t.rating ?? null,
    createdAt: t.createdAt,
  }));

  // Widget mode: no chrome, no header, transparent — designed to be embedded.
  if (embed) {
    return (
      <div className="wall wall-embed" style={vars}>
        <div className="sr-only">{meta.name} — {count} review{count === 1 ? '' : 's'}</div>
        <Widget
          items={items}
          tokens={tokens}
          cta={wall.form ? { href: `/forms/${wall.form.slug}`, label: 'Add a Review +' } : null}
        />
      </div>
    );
  }

  return (
    <div className="wall" style={vars}>
      <div className="wall-card">
        <header className="wall-head">
          <div className="eyebrow">Loved by customers</div>
          {wall.logoUrl && <img src={wall.logoUrl} alt={`${wall.tenantName} logo`} className="wall-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
          <h1>{wall.app.name}</h1>
          <p className="muted">
            Real reviews collected on <strong>{wall.tenantName}</strong> — moderated and published automatically.
          </p>
        </header>

        {count === 0 ? (
          <WidgetEmpty
            tokens={tokens}
            cta={wall.form ? { href: `/forms/${wall.form.slug}`, label: 'Add a Review +' } : null}
          />
        ) : (
          <>
            <div className="wall-actions">
              <span className="muted small">
                {count} review{count === 1 ? '' : 's'}
                {avgRating !== null && (
                  <>
                    {' '}· average <RatingStars value={avgRating} size="sm" /> {avgRating.toFixed(1)}
                  </>
                )}
              </span>
              <span className="muted small chip" title={`Design: ${meta.name}`}>
                {meta.name}
              </span>
              {wall.form && (
                <Link to={`/forms/${wall.form.slug}`} className="btn btn-teal">
                  Add a Review +
                </Link>
              )}
            </div>
            <div className="wall-design">
              <Widget items={items} tokens={tokens} cta={null} />
            </div>
            <p className="muted small" style={{ textAlign: 'center' }}>
              Latest review {timeAgo(items[0]?.createdAt ?? '')}
            </p>
          </>
        )}

        <footer className="wall-foot">
          <span>Powered by Zojatech — collect testimonials on any website.</span>
        </footer>
      </div>
    </div>
  );
}
