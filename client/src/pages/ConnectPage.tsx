/**
 * Product "Connect & design" — the tenant flow for putting testimonials to
 * work: product/testimonial IDs, the collect link for the website, the
 * display wall/embed snippet, and the design (accent colour) with live preview.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, FormRow, ThemeFontId, ThemeRadiusId } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, Label, PageHeader, Select } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';

export default function ConnectPage() {
  const { appId = '' } = useParams();
  const [app, setApp] = useState<AppSummary | null>(null);
  const [form, setForm] = useState<FormRow | null>(null);
  interface Override { primary: string | null; accent: string | null; radius: ThemeRadiusId | null; font: ThemeFontId | null; }
  const NONE: Override = { primary: null, accent: null, radius: null, font: null };
  const [ov, setOv] = useState<Override>(NONE);
  const [company, setCompany] = useState<{ primary: string; accent: string; radius: ThemeRadiusId; font: ThemeFontId } | null>(null);
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
        setForm(formsData.rows.find((f) => f.published) ?? formsData.rows[0] ?? null);
        const o = appRow.themeOverride;
        setOv({ primary: o?.primary ?? null, accent: o?.accent ?? null, radius: o?.radius ?? null, font: o?.font ?? null });
        api
          .get<{ theme: { primary: string; accent: string; radius: ThemeRadiusId; font: ThemeFontId } }>(`/v1/public/theme/${appRow.slug}`)
          .then((t) => {
            if (t.theme) setCompany({ primary: t.theme.primary, accent: t.theme.accent, radius: t.theme.radius, font: t.theme.font });
          })
          .catch(() => undefined);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load this product.'));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveDesign(): Promise<void> {
    if (!app) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ app: AppSummary }>(`/v1/apps/${app.id}`, {
        accentColor: ov.primary ?? null,
        themeAccent: ov.accent,
        themeRadius: ov.radius,
        themeFont: ov.font,
      });
      setApp(res.app);
      const o = res.app.themeOverride;
      setOv({ primary: o?.primary ?? null, accent: o?.accent ?? null, radius: o?.radius ?? null, font: o?.font ?? null });
      setNotice('Product design saved — this product now layers these tokens over the company theme.');
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

  const effPrimary = ov.primary ?? company?.primary ?? '#0ea5a0';
  const accent = effPrimary; // legacy var name — everything primary-branded follows it
  const dirtyDesign =
    ov.primary !== (app.themeOverride?.primary ?? null) ||
    ov.accent !== (app.themeOverride?.accent ?? null) ||
    ov.radius !== (app.themeOverride?.radius ?? null) ||
    ov.font !== (app.themeOverride?.font ?? null);

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
            <div className="stack" style={{ minWidth: 0 }}>
              <div className="muted small" style={{ lineHeight: 1.6 }}>
                This product can <strong>layer overrides</strong> on top of your company theme (set in{' '}
                <Link to="/app/settings/theme">Settings → Appearance &amp; theme</Link>). Leave a field on “Company” to inherit.
              </div>

              {company && (
                <div className="company-theme-line">
                  <span className="color-dots">
                    <i style={{ background: company.primary }} />
                    <i style={{ background: company.accent }} />
                  </span>
                  <span className="muted small">
                    Company theme now: {company.primary} · radius {company.radius} · font {company.font}
                  </span>
                </div>
              )}

              <div className="override-row">
                <Label>Product colour (primary)</Label>
                <div className="link-copy">
                  <input
                    type="color"
                    aria-label="Product primary colour"
                    value={ov.primary ?? company?.primary ?? '#0ea5a0'}
                    onChange={(e) => setOv((d) => ({ ...d, primary: e.target.value }))}
                  />
                  {ov.primary ? (
                    <Button variant="ghost" className="btn-xs" onClick={() => setOv((d) => ({ ...d, primary: null }))}>
                      Inherit company
                    </Button>
                  ) : (
                    <span className="chip chip-approved">Company</span>
                  )}
                </div>
              </div>

              <div className="override-row">
                <Label>Accent colour</Label>
                <div className="link-copy">
                  <input
                    type="color"
                    aria-label="Product accent colour"
                    value={ov.accent ?? company?.accent ?? '#0ea5a0'}
                    onChange={(e) => setOv((d) => ({ ...d, accent: e.target.value }))}
                  />
                  {ov.accent ? (
                    <Button variant="ghost" className="btn-xs" onClick={() => setOv((d) => ({ ...d, accent: null }))}>
                      Inherit company
                    </Button>
                  ) : (
                    <span className="chip chip-approved">Company</span>
                  )}
                </div>
              </div>

              <div className="override-row">
                <Label>Corner radius</Label>
                <Select value={ov.radius ?? ''} onChange={(e) => setOv((d) => ({ ...d, radius: (e.target.value || null) as ThemeRadiusId | null }))}>
                  <option value="">Company ({company?.radius ?? 'md'})</option>
                  <option value="sm">Sharp · 8</option>
                  <option value="md">Soft · 12</option>
                  <option value="lg">Rounded · 18</option>
                </Select>
              </div>

              <div className="override-row">
                <Label>Font</Label>
                <Select value={ov.font ?? ''} onChange={(e) => setOv((d) => ({ ...d, font: (e.target.value || null) as ThemeFontId | null }))}>
                  <option value="">Company ({company?.font ?? 'system'})</option>
                  <option value="system">System</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Mono</option>
                </Select>
              </div>

              <div className="modal-actions">
                <Button variant="outline" className="btn-xs" disabled={busy || !dirtyDesign} onClick={() => void saveDesign()}>
                  {busy ? 'Saving…' : 'Save product design'}
                </Button>
                {!company && <span className="muted small">Loading company theme…</span>}
              </div>
              <div className="muted small">
                Changes apply instantly to this product&apos;s form, wall and embeds (theme version bumps server-side).
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <Button variant="ghost" className="btn-xs" onClick={() => setDemoKey((k) => k + 1)}>
                    ↻ Re-mount demo
                  </Button>
                  <a className="btn btn-secondary btn-xs" href={`${origin}/external/acme.html?app=${app.slug}&form=${formSlug}`} target="_blank" rel="noreferrer">
                    Open example external site ↗
                  </a>
                </div>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  That page is a <strong>standalone external website</strong> (static HTML, no app) — it embeds Acme’s wall exactly like a
                  real third-party site would. Change the theme in Settings, then reload it.
                </p>
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
