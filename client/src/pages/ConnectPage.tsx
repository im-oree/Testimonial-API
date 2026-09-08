/**
 * Product "Connect & design" — the tenant flow for putting testimonials to
 * work: product/testimonial IDs, the collect link for the website, the
 * display wall/embed snippet, and the design (accent colour) with live preview.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, FormRow } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, Label, PageHeader } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';

const ACCENTS = ['#0ea5a0', '#1b2559', '#7c3aed', '#2563eb', '#0d9488', '#c026d3', '#e11d48', '#f59e0b'];

export default function ConnectPage() {
  const { appId = '' } = useParams();
  const [app, setApp] = useState<AppSummary | null>(null);
  const [form, setForm] = useState<FormRow | null>(null);
  const [accent, setAccent] = useState('#0ea5a0');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [demoKey, setDemoKey] = useState(0);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200').then((d) => d.rows.find((a) => a.id === appId) ?? null),
      api.get<{ rows: FormRow[] }>(`/v1/apps/${appId}/forms`),
    ])
      .then(([appRow, formsData]) => {
        if (!appRow) {
          setError('This product does not exist or you do not have access to it.');
          return;
        }
        setApp(appRow);
        setAccent(appRow.accentColor ?? '#0ea5a0');
        setForm(formsData.rows.find((f) => f.published) ?? formsData.rows[0] ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load this product.'));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAccent(): Promise<void> {
    if (!app) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ app: AppSummary }>(`/v1/apps/${app.id}`, { accentColor: accent });
      setApp(res.app);
      setNotice('Design saved — your public form and wall now use the new accent colour.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the design.');
    } finally {
      setBusy(false);
    }
  }

  // Live widget demo: actually loads /widget/embed.js like a real site would.
  useEffect(() => {
    if (!app) return;
    const host = document.getElementById('connect-widget-demo');
    if (!host) return;
    host.innerHTML = '';
    const sc = document.createElement('script');
    sc.src = `${window.location.origin}/widget/embed.js?demo=${demoKey}`;
    sc.setAttribute('data-app', app.slug);
    sc.setAttribute('data-container', 'connect-widget-demo');
    sc.setAttribute('data-height', '320');
    sc.async = true;
    host.appendChild(sc);
    return () => {
      host.innerHTML = '';
    };
  }, [app?.slug, app, demoKey]);

  async function copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — visual feedback still shows
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);
  }

  if (error && !app) return <ErrorBanner message={error} onRetry={load} />;
  if (!app)
    return (
      <div>
        <div className="card" style={{ padding: 18 }}>
          <span className="sk" style={{ display: "block", width: "38%", height: 17 }} />
          <span className="sk" style={{ display: "block", width: "66%", height: 11, marginTop: 9 }} />
        </div>
        <SkeletonCards count={3} height={140} wrap="grid" />
        <div className="card stack">
          <span className="sk" style={{ display: "block", width: "45%", height: 14 }} />
          <span className="sk" style={{ display: "block", width: "100%", height: 70 }} />
          <span className="sk" style={{ display: "block", width: "100%", height: 70 }} />
        </div>
      </div>
    );

  const origin = window.location.origin;
  const formSlug = form?.slug ?? `${app.slug}-review`;
  const formUrl = `${origin}/forms/${formSlug}`;
  const wallUrl = `${origin}/wall/${app.slug}`;
  const iframeSnippet = `<!-- Zojatech testimonials: product ${app.code} -->\n<iframe\n  src="${wallUrl}"\n  title="Reviews for ${app.name}"\n  loading="lazy"\n  style="width:100%;max-width:680px;border:0;border-radius:14px;min-height:420px;background:transparent">\n</iframe>`;
  const buttonSnippet = `<a href="${formUrl}" style="display:inline-block;background:${accent};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Leave a review</a>`;
  const widgetSnippet = `<!-- Zojatech widget — product ${app.code}: approved reviews only -->
<div id="zojatech-wall-${app.slug}"></div>
<script src="${origin}/widget/embed.js" data-app="${app.slug}" async></script>`;
  const apiSnippet = `// Developer path — CORS-open public GETs, no secret needed (approved data only)
const theme = await fetch("${origin}/v1/public/theme/${app.slug}").then((r) => r.json());
const wall = await fetch("${origin}/v1/public/walls/${app.slug}").then((r) => r.json());`;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: app.name, to: `/app/a/${app.id}/overview` },
          { label: 'Connect & design' },
        ]}
      />
      <PageHeader
        title="Connect & design"
        subtitle={`Wire "${app.name}" to a website and show its testimonials — three short steps, everything has an ID.`}
        actions={
          <Link className="btn btn-secondary" to={`/wall/${app.slug}`} target="_blank" rel="noreferrer">
            Preview wall ↗
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <div className="banner banner-ok">✓ {notice}</div>}

      <div className="stack connect-steps">
        {/* Step 1 — IDs */}
        <section className="card connect-step">
          <div className="connect-step-head">
            <span className="connect-num">1</span>
            <div>
              <h2 style={{ margin: 0 }}>Your testimonial IDs</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Every product has a stable set of IDs — you&apos;ll use them in the snippets below.
              </p>
            </div>
          </div>
          <div className="ids-box">
            <div>
              <Label>Product ID (code)</Label>
              <code style={{ color: accent }}>{app.code}</code>
            </div>
            <div>
              <Label>Product ID (system)</Label>
              <code>{app.id}</code>
            </div>
            <div>
              <Label>Wall slug</Label>
              <code>/{app.slug}</code>
            </div>
            <div>
              <Label>Form slug</Label>
              <code>/forms/{formSlug}</code>
            </div>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>
            The ID stays the same for the life of the product — remove it and the reviews on your site stop updating.
          </p>
        </section>

        {/* Step 2 — Collect */}
        <section className="card connect-step">
          <div className="connect-step-head">
            <span className="connect-num">2</span>
            <div>
              <h2 style={{ margin: 0 }}>Collect reviews on that website</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Put the review form on the site you want testimonials from — visitors submit, you approve in Moderation.
              </p>
            </div>
          </div>
          <div className="link-row">
            <div>
              <div className="small strong">Review form link</div>
              <div className="muted small">Link your "Leave a review" button to this URL.</div>
            </div>
            <div className="link-copy">
              <code>{`/forms/${formSlug}`}</code>
              <Button variant="outline" className="btn-xs" onClick={() => void copy(formUrl, 'form')}>
                {copied === 'form' ? 'Copied ✓' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="link-row">
            <div>
              <div className="small strong">Styled button snippet</div>
              <div className="muted small">Paste anywhere in your site HTML — styled to your brand.</div>
            </div>
            <Button variant="outline" className="btn-xs" onClick={() => void copy(buttonSnippet, 'btn')}>
              {copied === 'btn' ? 'Copied ✓' : 'Copy'}
            </Button>
          </div>
          {!form?.published && <p className="muted small">Tip: publish a form on the Forms page to accept submissions first.</p>}
        </section>

        {/* Step 3 — Display + design */}
        <section className="card connect-step">
          <div className="connect-step-head">
            <span className="connect-num">3</span>
            <div>
              <h2 style={{ margin: 0 }}>Show testimonials anywhere — design it</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Embed your live wall on any other site. Approved reviews flow in automatically; nothing to rebuild.
              </p>
            </div>
          </div>

          <div className="two-col" style={{ marginBottom: 0 }}>
            <div>
              <Label>Embed snippet (copy into &lt;body&gt;)</Label>
              <pre className="code-block">
                <code>{iframeSnippet}</code>
              </pre>
              <Button variant="secondary" className="btn-xs" onClick={() => void copy(iframeSnippet, 'embed')}>
                {copied === 'embed' ? 'Copied ✓' : 'Copy embed snippet'}
              </Button>
            </div>
            <div>
              <Label>Design — accent colour</Label>
              <div className="swatches" style={{ marginBottom: 10 }}>
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={`Accent ${c}`}
                    className={`swatch ${accent.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setAccent(c)}
                  />
                ))}
                <label className="swatch swatch-custom" title="Custom colour">
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
                  +
                </label>
              </div>
              <Button variant="outline" className="btn-xs" disabled={busy || accent === (app.accentColor ?? '#0ea5a0')} onClick={() => void saveAccent()}>
                {busy ? 'Saving…' : 'Save design'}
              </Button>
              <div className="muted small" style={{ marginTop: 8 }}>
                Changes apply to the live form, wall and preview instantly.
              </div>
            </div>
          </div>

          <div>
            <Label>Live preview</Label>
            <div className="wall-preview">
              <div className="wall-preview-bar" style={{ background: accent }} />
              <div className="wall-preview-body">
                <div className="strong" style={{ color: accent }}>
                  {app.name}
                </div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="star on">
                      ★
                    </span>
                  ))}
                </div>
                <p className="wall-preview-quote">“Absolutely love it — onboarding took minutes and support is superb.”</p>
                <div className="muted small">— Sara Okafor · 2 days ago</div>
                <button type="button" className="btn" style={{ background: accent, color: '#fff' }}>
                  Add a Review +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4 — Widget, no-code, secure */}
        <section className="card connect-step">
          <div className="connect-step-head">
            <span className="connect-num">4</span>
            <div>
              <h2 style={{ margin: 0 }}>Widget — one script tag, no code</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Drop a <code>div</code> + <code>script</code> into any website (WordPress, Webflow, Shopify, plain HTML). No build step, no npm, no API keys.
              </p>
            </div>
          </div>

          <div className="two-col" style={{ marginBottom: 0 }}>
            <div className="stack">
              <div>
                <Label>Copy-paste snippet</Label>
                <pre className="code-block">
                  <code>{widgetSnippet}</code>
                </pre>
                <Button variant="secondary" className="btn-xs" onClick={() => void copy(widgetSnippet, 'widget')}>
                  {copied === 'widget' ? 'Copied ✓' : 'Copy widget snippet'}
                </Button>
              </div>
              <div>
                <Label>Live widget demo (this page)</Label>
                <div id="connect-widget-demo" className="widget-demo" />
                <Button variant="ghost" className="btn-xs" style={{ marginTop: 6 }} onClick={() => setDemoKey((k) => k + 1)}>
                  ↻ Re-mount demo
                </Button>
              </div>
            </div>

            <div className="stack">
              <div>
                <Label>Developer path (little code)</Label>
                <pre className="code-block">
                  <code>{apiSnippet}</code>
                </pre>
              </div>
              <ul className="plain-list connect-security">
                <li>
                  <strong>Secure by design</strong> — the snippet contains no secret: the wall and these GET endpoints only ever serve{' '}
                  <em>approved</em> reviews and your resolved theme. Moderation happens server-side before anything is published.
                </li>
                <li>
                  <strong>One theme, every embed</strong> — walls resolve your tenant theme on every load, so preset/token/logo edits in
                  Settings (or by Zojatech) appear on all sites automatically. The accent colour you saved above is this product&apos;s override.
                </li>
                <li>
                  <strong>Future-proof</strong> — this product ID ({app.id}) and slug (<code>{app.slug}</code>) are stable for life; upgraded
                  widget runtimes (React, carousels, marketplace templates) slot in behind the same public API.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
