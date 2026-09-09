/**
 * Templates — the marketplace gallery.
 *
 * Every widget template Zojatech ships, browsable in one place: category
 * pills, search, live previews. Using one is a click — pick the product,
 * start a draft to customise first, or apply it right away. No pricing, no
 * tiers: everything here is free and ready.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, WidgetTemplateRow } from '../lib/types';
import { TemplatePreview } from '../components/TemplatePreview';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { ConfirmDialog } from '../components/menu';
import Modal from '../components/Modal';
import { IconSearch, IconX } from '../components/icons';
import { toast } from '../components/Toast';
import { Field, SelectField, TextInput } from '../components/fields';

export default function TemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<WidgetTemplateRow[] | null>(null);
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<WidgetTemplateRow | null>(null);
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState<'draft' | 'apply' | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.get<{ rows: WidgetTemplateRow[] }>('/v1/widget-templates'),
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200'),
    ])
      .then(([tpls, appsRes]) => {
        setTemplates(tpls.rows);
        setApps(appsRes.rows);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the template gallery.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const t of templates ?? []) set.add(t.category);
    return [...set];
  }, [templates]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates ?? []).filter(
      (t) =>
        (category === 'All' || t.category === category) &&
        (q === '' || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [templates, category, search]);

  const product = apps.find((a) => a.id === productId) ?? null;

  function flash(msg: string): void {
    toast(msg);
  }

  /** Start an unpublished draft from the template and jump into the studio. */
  async function startDraft(): Promise<void> {
    if (!open || !product) return;
    setBusy('draft');
    setError(null);
    try {
      await api.post(`/v1/apps/${product.id}/widget-template/${open.id}/draft`);
      navigate(`/app/a/${product.id}/studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the draft.');
      setBusy(null);
    }
  }

  /** Apply now: the product's live widget switches to this template. */
  async function applyNow(): Promise<void> {
    if (!open || !product) return;
    setBusy('apply');
    setConfirmApply(false);
    setError(null);
    try {
      await api.post(`/v1/apps/${product.id}/widget-template/${open.id}/apply`);
      setOpen(null);
      setBusy(null);
      flash(`${open.name} is now live on ${product.name}.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the template.');
      setBusy(null);
    }
  }

  const hasDesign = (product?.studioVersion ?? 0) > 0;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Templates' }]} />
      <PageHeader
        title="Templates"
        subtitle="Every widget template, ready to use — pick a product, customise it in the studio or apply it straight away."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Category pills + search */}
      <div className="market-toolbar">
        <div className="chip-row" role="tablist" aria-label="Template categories">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`tpl-cat-pill ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="market-search">
          <IconSearch size={14} />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" aria-label="Search templates" />
          {search && (
            <button type="button" className="ctx-trigger" aria-label="Clear search" onClick={() => setSearch('')}>
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      {!templates && (
        <div className="tpl-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card tpl-card">
              <div className="tpl-card-preview"><span className="sk tpl-preview-sk" /></div>
              <div className="tpl-card-body">
                <span className="sk" style={{ display: 'block', width: '55%', height: 15 }} />
                <span className="sk" style={{ display: 'block', width: '80%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {templates && rows.length === 0 && (
        <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p className="muted" style={{ margin: '0 0 10px' }}>No templates match your filters.</p>
          <Button
            variant="secondary"
            className="btn-sm"
            onClick={() => {
              setSearch('');
              setCategory('All');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {templates && rows.length > 0 && (
        <div className="tpl-grid">
          {rows.map((t) => (
            <button key={t.id} type="button" className="card tpl-card tpl-card-click" onClick={() => { setOpen(t); setProductId(apps[0]?.id ?? ''); }}>
              <div className="tpl-card-preview">
                <TemplatePreview schema={t.schema} />
                <span className="tpl-dims-badge">{t.width} × {t.height}</span>
              </div>
              <div className="tpl-card-body">
                <div className="tpl-card-title">
                  <span className="strong">{t.name}</span>
                  <span className="chip">{t.category}</span>
                </div>
                <p className="muted small tpl-card-desc">{t.description}</p>
                <span className="muted small">Click to preview &amp; use →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview + use */}
      <Modal open={open !== null} onClose={() => setOpen(null)} width={880}>
        {open && (
          <div>
            <div className="tpl-use-head">
              <h2 style={{ margin: 0, fontSize: 17 }}>{open.name}</h2>
              <Button variant="ghost" className="btn-xs" onClick={() => setOpen(null)} aria-label="Close">
                <IconX size={13} />
              </Button>
            </div>
            <div className="tpl-use">
            <div className="tpl-use-preview">
              <TemplatePreview schema={open.schema} />
            </div>
            <div className="tpl-use-side">
              <p className="muted small" style={{ margin: 0 }}>
                {open.description}
              </p>
              <div className="chip-row">
                <span className="chip">{open.width} × {open.height}px</span>
                <span className="chip">{open.category}</span>
                {open.features.map((f) => (
                  <span key={f} className="chip chip-tag">{f}</span>
                ))}
              </div>
              {apps.length > 0 ? (
                <>
                  <Field label="Use it for" hint="Start a draft to customise first — or apply it live right away.">
                    <SelectField size="sm" value={productId} onChange={(e) => setProductId(e.target.value)}>
                      {apps.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </SelectField>
                  </Field>
                  <div className="tpl-use-actions">
                    <Button disabled={!product || busy !== null} onClick={() => void startDraft()}>
                      {busy === 'draft' ? 'Starting…' : 'Customise in studio'}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!product || busy !== null}
                      onClick={() => (hasDesign ? setConfirmApply(true) : void applyNow())}
                    >
                      {busy === 'apply' ? 'Applying…' : 'Apply now'}
                    </Button>
                  </div>
                  {product && (
                    <p className="muted small" style={{ margin: 0 }}>
                      Current design:{' '}
                      {hasDesign ? (
                        <Link to={`/app/a/${product.id}/connect`}>{product.designTemplateId ?? 'a customized design'}</Link>
                      ) : (
                        'none yet'
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  Create a product first — templates are applied per product.
                </p>
              )}
            </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmApply}
        title={`Apply ${open?.name ?? 'this template'} to ${product?.name ?? 'this product'}?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            Applying replaces {product?.name}&apos;s current widget design with a fresh copy of the template. Your reviews,
            forms and moderation queue are untouched.
          </p>
        }
        confirmLabel="Apply template"
        busy={busy === 'apply'}
        onConfirm={() => void applyNow()}
        onCancel={() => setConfirmApply(false)}
      />
    </div>
  );
}
