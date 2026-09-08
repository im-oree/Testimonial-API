/**
 * Product "Connect" — put the widget on a website.
 *
 * The embed hub: the live preview of whatever design the product currently
 * serves (the exact widget visitors see, running the real component with real
 * reviews), step-by-step instructions, and the copy-paste snippets (iframe,
 * auto-sizing script, direct link). Kept separate from the Widget tab so
 * picking a template and wiring it into a site are two clean jobs.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppName } from '../lib/useAppName';
import type { AppSummary, PublicWall } from '../lib/types';
import type { StudioRecord, StudioSchema } from '../design-studio/types';
import { TemplateWidget } from '../widgets/TemplateWidget';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { IconCheck, IconCopy, IconEdit, IconExternal } from '../components/icons';

/** The live widget scaled to fit its frame — same component the embed runs. */
function LiveWidgetPreview({ schema, records, ctaHref }: { schema: StudioSchema; records: StudioRecord[]; ctaHref: string | null }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = (): void => {
      const w = box.clientWidth;
      if (w > 0) setScale(Math.min(1, w / schema.canvas.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [schema.canvas.width]);

  const h = Math.round(schema.canvas.height * scale);

  return (
    <div ref={boxRef} className="connect-preview" style={{ height: Math.max(h, 120) }}>
      <div
        className="connect-preview-inner"
        style={{ width: schema.canvas.width, height: schema.canvas.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <TemplateWidget schema={schema} records={records} ctaHref={ctaHref} />
      </div>
    </div>
  );
}

export default function EmbedPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);

  const [app, setApp] = useState<AppSummary | null>(null);
  const [wall, setWall] = useState<PublicWall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((d) => {
        const row = d.rows.find((a) => a.id === appId) ?? null;
        setApp(row);
        if (!row) throw new Error('Product not found.');
        return api.get<PublicWall>(`/v1/public/walls/${row.slug}`);
      })
      .then((w) => setWall(w))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load this product.'));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load, tick]);

  async function copy(key: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      window.prompt('Copy this snippet:', text);
    }
  }

  const slug = app?.slug ?? '';
  const origin = window.location.origin;
  const widget = wall?.widget ?? null;
  const records: StudioRecord[] = (wall?.testimonials ?? []).map((t) => ({
    content: t.content,
    authorName: t.authorName ?? 'Anonymous visitor',
    rating: t.rating ?? 0,
    createdAt: t.createdAt,
  }));
  const ctaHref = wall?.form ? `${origin}/forms/${wall.form.slug}` : null;

  const iframeSnippet = `<iframe src="${origin}/wall/${slug}?embed=1" width="${widget?.width ?? 720}" height="${widget?.height ?? 560}" style="border:0;border-radius:14px;max-width:100%" title="Customer reviews" loading="lazy"></iframe>`;
  const scriptSnippet = `<div id="zojatech-wall-${slug}"></div>\n<script src="${origin}/widget/embed.js" data-app="${slug}" async></script>`;
  const wallUrl = `${origin}/wall/${slug}`;

  const copyButton = (key: string, text: string) => (
    <Button variant="ghost" className="btn-xs" onClick={() => void copy(key, text)}>
      {copied === key ? (
        <>
          <IconCheck size={12} /> Copied
        </>
      ) : (
        <>
          <IconCopy size={12} /> Copy
        </>
      )}
    </Button>
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Connect' },
        ]}
      />
      <PageHeader
        title="Connect"
        subtitle="Put your widget on any website — one line of code, sized to your design, always in sync with your reviews."
        actions={
          widget ? (
            <Link className="btn btn-outline" to={`/app/a/${appId}/studio`}>
              <IconEdit size={13} /> Customize in studio
            </Link>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => setTick((t) => t + 1)} />}

      {app?.designDraft && (
        <div className="draft-banner" role="status">
          <span className="strong small">Draft in progress</span>
          <span className="muted small">The live embed keeps serving your published design until you publish from the studio.</span>
          <span className="draft-banner-actions">
            <Link className="btn btn-secondary btn-xs" to={`/app/a/${appId}/studio`}>
              <IconEdit size={12} /> Open studio
            </Link>
          </span>
        </div>
      )}

      {/* ---- 1 · The live widget ------------------------------------------- */}
      <section className="tpl-section">
        <div className="section-head">
          <div>
            <h2 style={{ margin: 0 }}>Your widget, live</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              {widget
                ? `${widget.name} · ${widget.width} × ${widget.height}px — this is exactly what visitors on your site see, running your live reviews.`
                : 'No design yet — pick a template on the Widget tab and it will show up here.'}
            </p>
          </div>
          {widget && (
            <Link className="btn btn-ghost btn-sm" to={`/wall/${slug}`}>
              Open the wall <IconExternal size={13} />
            </Link>
          )}
        </div>

        {widget ? (
          <div className="card">
            <LiveWidgetPreview schema={widget.schema} records={records} ctaHref={ctaHref} />
          </div>
        ) : (
          <div className="card connect-empty">
            <p className="muted" style={{ margin: 0 }}>
              Pick a template on the <Link to={`/app/a/${appId}/connect`}>Widget</Link> tab — your live preview and embed code appear here.
            </p>
          </div>
        )}
      </section>

      {/* ---- 2 · How it works ---------------------------------------------- */}
      <section className="tpl-section">
        <div className="section-head">
          <div>
            <h2 style={{ margin: 0 }}>How it works</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Three steps, no build step, nothing to redeploy.
            </p>
          </div>
        </div>
        <div className="connect-steps">
          <div className="card connect-step">
            <span className="connect-step-no">1</span>
            <div>
              <span className="strong">Design your widget</span>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Pick a template and customise it in the studio. Publish when it looks right — the embed follows on the next load.
              </p>
            </div>
          </div>
          <div className="card connect-step">
            <span className="connect-step-no">2</span>
            <div>
              <span className="strong">Copy a snippet</span>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                The iframe reserves the exact space your design needs; the auto-sizing script adapts to narrow screens on its own.
              </p>
            </div>
          </div>
          <div className="card connect-step">
            <span className="connect-step-no">3</span>
            <div>
              <span className="strong">Paste it into your site</span>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Anywhere HTML works — landing pages, docs, your store. New approved reviews appear automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 3 · Your embed code ------------------------------------------- */}
      <section className="tpl-section">
        <div className="section-head">
          <div>
            <h2 style={{ margin: 0 }}>Your embed code</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              {widget ? `Sized to your design — ${widget.name} · ${widget.width} × ${widget.height}px.` : 'Pick a design on the Widget tab first.'}
            </p>
          </div>
        </div>

        <div className="embed-grid">
          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Drop-in iframe</span>
              {copyButton('iframe', iframeSnippet)}
            </div>
            <pre className="embed-code">
              <code>{iframeSnippet}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              Fixed size — reserve {widget?.width ?? 720} × {widget?.height ?? 560}px and it fits first time, every time.
            </p>
          </div>

          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Auto-sizing script</span>
              {copyButton('script', scriptSnippet)}
            </div>
            <pre className="embed-code">
              <code>{scriptSnippet}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              Sizes itself to the design and scales down on narrow screens — design edits appear on every site embedding it.
            </p>
          </div>

          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Direct link</span>
              {copyButton('url', wallUrl)}
            </div>
            <pre className="embed-code">
              <code>{wallUrl}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              The public wall — every approved review, full page. Share it or link it from your site.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
