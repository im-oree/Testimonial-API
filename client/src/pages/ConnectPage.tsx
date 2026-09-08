/**
 * Product "Connect & design" — pick the widget design, fine-tune this
 * product's look (layered over the company theme), preview with live data and
 * copy the embed code. Noise (IDs, security notes, developer API) is tucked
 * into collapsible sections so the useful part sits on top and the page stays
 * responsive — the preview reflows instead of cropping.
 */
import { IconCheck, IconChevronDown, IconExternal } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, FormRow, PublicWall, ThemeFontId, ThemeRadiusId } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, Label, PageHeader, Select } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';
import { DEFAULT_WIDGET_DESIGN, getWidgetDesign, SAMPLE_ITEMS, WIDGET_DESIGNS, type WidgetItem, type WidgetTokens } from '../widgets';
import { RADIUS_OPTIONS, softOf } from '../lib/theme';

interface Override {
  primary: string | null;
  accent: string | null;
  radius: ThemeRadiusId | null;
  font: ThemeFontId | null;
}
const NONE: Override = { primary: null, accent: null, radius: null, font: null };

interface CompanyTheme {
  primary: string;
  accent: string;
  radius: ThemeRadiusId;
  font: ThemeFontId;
}

const FALLBACK: CompanyTheme = { primary: '#0ea5a0', accent: '#7c6fe0', radius: 'md', font: 'system' };

export default function ConnectPage() {
  const { appId = '' } = useParams();
  const [app, setApp] = useState<AppSummary | null>(null);
  const [form, setForm] = useState<FormRow | null>(null);
  const [wall, setWall] = useState<PublicWall | null>(null);
  const [company, setCompany] = useState<CompanyTheme | null>(null);
  const [ov, setOv] = useState<Override>(NONE);
  const [designSel, setDesignSel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [codeTab, setCodeTab] = useState<'widget' | 'iframe' | 'button' | 'api'>('widget');
  const [open, setOpen] = useState<{ collect: boolean; details: boolean }>({ collect: false, details: false });

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200').then((d) => d.rows.find((a) => a.id === appId) ?? null),
      api.get<{ rows: FormRow[] }>(`/v1/apps/${appId}/forms`),
      api.get<{ theme: CompanyTheme }>('/v1/settings/theme'),
    ])
      .then(([appRow, formsData, themeRes]) => {
        if (!appRow) {
          setError('This product does not exist or you do not have access to it.');
          return;
        }
        setApp(appRow);
        setForm(formsData.rows.find((f) => f.published) ?? formsData.rows[0] ?? null);
        const o = appRow.themeOverride;
        setOv({ primary: o?.primary ?? null, accent: o?.accent ?? null, radius: o?.radius ?? null, font: o?.font ?? null });
        setDesignSel(appRow.widgetDesign ?? null);
        if (themeRes?.theme) {
          setCompany({
            primary: themeRes.theme.primary,
            accent: themeRes.theme.accent,
            radius: themeRes.theme.radius,
            font: themeRes.theme.font,
          });
        }
        return appRow.slug;
      })
      .then((slug) => {
        if (slug) {
          api
            .get<PublicWall>(`/v1/public/walls/${slug}`)
            .then((w) => setWall(w))
            .catch(() => undefined);
        }
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
      const patch: Record<string, unknown> = {
        accentColor: ov.primary ?? null,
        themeAccent: ov.accent,
        themeRadius: ov.radius,
        themeFont: ov.font,
      };
      if ((designSel ?? null) !== (app.widgetDesign ?? null)) patch.widgetDesign = designSel ?? null;
      const res = await api.patch<{ app: AppSummary }>(`/v1/apps/${app.id}`, patch);
      setApp(res.app);
      const o = res.app.themeOverride;
      setOv({ primary: o?.primary ?? null, accent: o?.accent ?? null, radius: o?.radius ?? null, font: o?.font ?? null });
      setNotice(`Saved — design "${getWidgetDesign(res.app.widgetDesign ?? null).meta.name}" and this product's look are live on its wall and every embed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the design.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — visual feedback still shows
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);
  }

  const loadingSkeleton =
    !app ? (
      <div>
        <div className="card" style={{ padding: 18 }}>
          <span className="sk" style={{ display: 'block', width: '38%', height: 17 }} />
          <span className="sk" style={{ display: 'block', width: '66%', height: 11, marginTop: 9 }} />
        </div>
        <SkeletonCards count={3} height={150} wrap="grid" />
      </div>
    ) : null;

  if (error && !app) return <ErrorBanner message={error} onRetry={load} />;
  if (loadingSkeleton) return loadingSkeleton;

  const comp = company ?? FALLBACK;
  const primary = ov.primary ?? comp.primary;
  const accent = ov.accent ?? comp.accent;
  const radius = ov.radius ?? comp.radius;
  const font = ov.font ?? comp.font;
  const dirtyDesign =
    ov.primary !== (app!.themeOverride?.primary ?? null) ||
    ov.accent !== (app!.themeOverride?.accent ?? null) ||
    ov.radius !== (app!.themeOverride?.radius ?? null) ||
    ov.font !== (app!.themeOverride?.font ?? null) ||
    (designSel ?? null) !== (app!.widgetDesign ?? null);

  const origin = window.location.origin;
  const formSlug = form?.slug ?? `${app!.slug}-review`;
  const formUrl = `${origin}/forms/${formSlug}`;
  const wallEmbedUrl = `${origin}/wall/${app!.slug}?embed=1`;

  const widgetSnippet = `<!-- Zojatech widget — ${app!.name}: approved reviews only -->
<div id="zojatech-wall-${app!.slug}"></div>
<script src="${origin}/widget/embed.js" data-app="${app!.slug}" async></script>`;
  const iframeSnippet = `<!-- Zojatech wall (auto-height embed) — product ${app!.code} -->
<iframe
  src="${wallEmbedUrl}"
  title="Reviews for ${app!.name}"
  loading="lazy"
  style="width:100%;max-width:680px;border:0;min-height:300px;background:transparent"
></iframe>`;
  const buttonSnippet = `<a href="${formUrl}" style="display:inline-block;background:${primary};color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Leave a review</a>`;
  const apiSnippet = `// Developer path — CORS-open public GETs, no secret needed (approved data only)
const theme = await fetch("${origin}/v1/public/theme/${app!.slug}").then((r) => r.json());
const wall = await fetch("${origin}/v1/public/walls/${app!.slug}").then((r) => r.json());
// wall.design selects the widget design; wall.theme carries the tokens.`;

  const tokens: WidgetTokens = {
    primary,
    soft: softOf(primary),
    accent,
    radiusPx: RADIUS_OPTIONS.find((r) => r.id === radius)?.px ?? 12,
    font,
  };

  const realItems: WidgetItem[] = (wall?.testimonials ?? []).map((t) => ({
    id: t.id,
    content: t.content,
    authorName: t.authorName,
    rating: t.rating,
    createdAt: t.createdAt,
  }));
  const previewItems = realItems.length > 0 ? realItems : SAMPLE_ITEMS;
  const usingSample = realItems.length === 0;
  const designId = designSel ?? app!.widgetDesign ?? DEFAULT_WIDGET_DESIGN;
  const { meta: designMeta, component: DesignWidget } = getWidgetDesign(designId);

  const codeBlocks: Record<string, { label: string; hint: string; code: string; copyKey: string }> = {
    widget: { label: 'Widget — one script tag', hint: 'Best for any site: WordPress, Webflow, Shopify, plain HTML. Auto-height, no crop.', code: widgetSnippet, copyKey: 'widget' },
    iframe: { label: 'Iframe embed', hint: 'Drop-in iframe that resizes to the wall height automatically.', code: iframeSnippet, copyKey: 'embed' },
    button: { label: 'Review button', hint: 'Point your "Leave a review" button at the public form.', code: buttonSnippet, copyKey: 'btn' },
    api: { label: 'Developer API', hint: 'Little-code path: fetch approved reviews + resolved theme directly.', code: apiSnippet, copyKey: 'api' },
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: app!.name, to: `/app/a/${app!.id}/overview` },
          { label: 'Connect & design' },
        ]}
      />
      <PageHeader
        title="Connect & design"
        subtitle={`${app!.name} — pick a look from the widget library, fine-tune it for this product, preview with live reviews, then copy the snippet.`}
        actions={
          <Link className="btn btn-secondary" to={`/wall/${app!.slug}`} target="_blank" rel="noreferrer">
            Preview wall <IconExternal size={13} />
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <div className="banner banner-ok"><IconCheck size={13} /> {notice}</div>}

      <div className="stack" style={{ gap: 16 }}>
        {/* ---- Design picker ---- */}
        <section className="card" style={{ padding: 18 }}>
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>1 · Pick the look</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Every design shows the same things — reviewer, rating, message, time — in its own layout. One file per design, all plug-and-play.
              </p>
            </div>
          </div>

          <div className="design-layout">
            <div className="design-tiles">
              {WIDGET_DESIGNS.map((d) => {
                const active = d.meta.id === designId;
                return (
                  <button
                    key={d.meta.id}
                    type="button"
                    onClick={() => setDesignSel(d.meta.id)}
                    aria-pressed={active}
                    className={`design-tile${active ? ' active' : ''}`}
                    style={active ? { borderColor: primary, boxShadow: `0 0 0 3px ${primary}22` } : undefined}
                  >
                    <span className="design-tile-head">
                      <span className="strong">{d.meta.name}</span>
                      {active && <IconCheck size={13} />}
                    </span>
                    <span className="design-tile-tag muted small">{d.meta.tagline}</span>
                    <span className="design-tile-feats">
                      {d.meta.features.slice(0, 2).map((f) => (
                        <span key={f} className="chip">{f}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="design-appearance card-soft">
              <div className="section-sub">
                <div className="strong">Fine-tune for this product</div>
                <div className="muted small">Leave a field on “Company” to inherit {app!.name === 'Acme' ? 'the company theme' : 'your company theme'}.</div>
              </div>

              {company ? (
                <div className="company-theme-line">
                  <span className="color-dots">
                    <i style={{ background: company.primary }} />
                    <i style={{ background: company.accent }} />
                  </span>
                  <span className="muted small">Company theme: {company.primary} · {company.radius} corners · {company.font} font</span>
                </div>
              ) : (
                <div className="muted small">Loading company theme…</div>
              )}

              <div className="mini-grid">
                <div>
                  <Label>Product colour</Label>
                  <div className="link-copy">
                    <input type="color" aria-label="Product primary colour" value={primary}
                      onChange={(e) => setOv((d) => ({ ...d, primary: e.target.value }))} />
                    {ov.primary ? (
                      <Button variant="ghost" className="btn-xs" onClick={() => setOv((d) => ({ ...d, primary: null }))}>Inherit company</Button>
                    ) : <span className="chip chip-approved">Company</span>}
                  </div>
                </div>
                <div>
                  <Label>Accent colour</Label>
                  <div className="link-copy">
                    <input type="color" aria-label="Product accent colour" value={accent}
                      onChange={(e) => setOv((d) => ({ ...d, accent: e.target.value }))} />
                    {ov.accent ? (
                      <Button variant="ghost" className="btn-xs" onClick={() => setOv((d) => ({ ...d, accent: null }))}>Inherit company</Button>
                    ) : <span className="chip chip-approved">Company</span>}
                  </div>
                </div>
                <div>
                  <Label>Corners</Label>
                  <Select value={ov.radius ?? ''} onChange={(e) => setOv((d) => ({ ...d, radius: (e.target.value || null) as ThemeRadiusId | null }))}>
                    <option value="">Company ({company?.radius ?? 'md'})</option>
                    <option value="sm">Sharp</option>
                    <option value="md">Soft</option>
                    <option value="lg">Rounded</option>
                  </Select>
                </div>
                <div>
                  <Label>Font</Label>
                  <Select value={ov.font ?? ''} onChange={(e) => setOv((d) => ({ ...d, font: (e.target.value || null) as ThemeFontId | null }))}>
                    <option value="">Company ({company?.font ?? 'system'})</option>
                    <option value="system">System</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Mono</option>
                  </Select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 10 }}>
                <Button variant="secondary" disabled={busy || !dirtyDesign} onClick={() => void saveDesign()}>
                  {busy ? 'Saving…' : dirtyDesign ? 'Save product design' : 'Saved — up to date'}
                </Button>
              </div>
            </div>
          </div>

          {/* ---- Live preview: real render of the chosen design, never cropped ---- */}
          <div style={{ marginTop: 18 }}>
            <div className="section-sub" style={{ marginBottom: 6 }}>
              <span className="strong">Live preview — {designMeta.name}</span>
              <span className="muted small" style={{ marginLeft: 8 }}>{designMeta.tagline}</span>
            </div>
            {usingSample && (
              <p className="muted small" style={{ margin: '0 0 8px' }}>
                No approved reviews yet, so you are seeing sample content. Approve a few in Moderation and this preview switches to real reviews.
              </p>
            )}
            <div className="preview-frame">
              <div className="preview-frame-bar">
                <i /><i /><i />
                <span className="muted small">{wallEmbedUrl}</span>
              </div>
              <div className="preview-frame-body">
                <DesignWidget items={previewItems} tokens={tokens} cta={form ? { href: formUrl, label: 'Add a Review +' } : null} />
              </div>
            </div>
          </div>
        </section>

        {/* ---- 2 · Get the code (open) ---- */}
        <section className="card" style={{ padding: 18 }}>
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>2 · Get the code</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Paste on the website where {app!.name} reviews should appear. {usingSample ? 'Live approved reviews' : `${realItems.length} approved review${realItems.length === 1 ? '' : 's'} live now`} — nothing to rebuild when new ones are approved.
              </p>
            </div>
          </div>

          <div className="segmented" role="tablist" aria-label="Embed options">
            {(Object.keys(codeBlocks) as ('widget' | 'iframe' | 'button' | 'api')[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={codeTab === k} className={`segment ${codeTab === k ? 'active' : ''}`} onClick={() => setCodeTab(k)}>
                {codeBlocks[k].label.split('—')[0].trim()}
              </button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>{codeBlocks[codeTab].hint}</p>
          <pre className="code-block" style={{ marginTop: 8 }}><code>{codeBlocks[codeTab].code}</code></pre>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" className="btn-sm" onClick={() => void copy(codeBlocks[codeTab].code, codeBlocks[codeTab].copyKey)}>
              {copied === codeBlocks[codeTab].copyKey ? (<><IconCheck size={12} /> Copied</>) : 'Copy snippet'}
            </Button>
            <a className="btn btn-outline btn-sm" href={`${origin}/external/acme.html?app=${app!.slug}&form=${formSlug}`} target="_blank" rel="noreferrer">
              See it on an example external site <IconExternal size={13} />
            </a>
          </div>
          <p className="muted small" style={{ margin: '8px 0 0' }}>
            The example page is a <strong>standalone static website</strong> (not this app) embedding the widget with this product's data. Step-by-step verification: <code>docs/integration-test-guide.md</code>.
          </p>

          <button type="button" className="collapse-toggle" onClick={() => setOpen((o) => ({ ...o, collect: !o.collect }))} aria-expanded={open.collect}>
            3 · Collect reviews on that website
            <IconChevronDown className={open.collect ? 'flip' : ''} />
          </button>
          {open.collect && (
            <div className="collapse-body">
              <div className="link-row">
                <div>
                  <div className="small strong">Review form link</div>
                  <div className="muted small">Link your “Leave a review” button to this URL.</div>
                </div>
                <div className="link-copy">
                  <code>{`/forms/${formSlug}`}</code>
                  <Button variant="outline" className="btn-xs" onClick={() => void copy(formUrl, 'form')}>
                    {copied === 'form' ? (<><IconCheck size={12} /> Copied</>) : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="link-row">
                <div>
                  <div className="small strong">Review button snippet</div>
                  <div className="muted small">Styled with this product's colour ({primary}).</div>
                </div>
                <Button variant="outline" className="btn-xs" onClick={() => void copy(buttonSnippet, 'btn2')}>
                  {copied === 'btn2' ? (<><IconCheck size={12} /> Copied</>) : 'Copy'}
                </Button>
              </div>
              {!form?.published && <p className="muted small">Tip: publish a form on the Forms page to accept submissions first.</p>}
            </div>
          )}

          <button type="button" className="collapse-toggle" onClick={() => setOpen((o) => ({ ...o, details: !o.details }))} aria-expanded={open.details}>
            4 · IDs, security &amp; developer notes
            <IconChevronDown className={open.details ? 'flip' : ''} />
          </button>
          {open.details && (
            <div className="collapse-body">
              <div className="ids-box">
                <div><Label>Product code</Label><code style={{ color: primary }}>{app!.code}</code></div>
                <div><Label>Product ID (system)</Label><code>{app!.id}</code></div>
                <div><Label>Wall slug</Label><code>/{app!.slug}</code></div>
                <div><Label>Form slug</Label><code>/forms/{formSlug}</code></div>
              </div>
              <ul className="plain-list connect-security">
                <li>
                  <strong>Secure by design</strong> — snippets contain no secret; walls and public GETs serve only approved reviews and the resolved theme.
                </li>
                <li>
                  <strong>One theme, every embed</strong> — template/company/product tokens resolve on every load, so edits appear everywhere instantly.
                </li>
                <li>
                  <strong>Future-proof</strong> — stable IDs mean upgraded widget runtimes slot in behind the same public API.
                </li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
