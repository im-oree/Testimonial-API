/**
 * Platform — Theme Templates library (Zojatech-owned). Templates surface in
 * every tenant's Appearance page; tenants adopt one and fine-tune it. This
 * page is where the "owners" create/view/edit the catalogue.
 */
import { IconCheck, IconPlus } from '../../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ThemeFontId, ThemePresetSummary, ThemeRadiusId } from '../../lib/types';
import { Breadcrumbs, Button, ErrorBanner, Label, PageHeader, TextInput } from '../../components/ui';
import { ConfirmDialog, KebabMenu } from '../../components/menu';

const EMPTY = { id: '', name: '', description: '', primary: '#1b2559', accent: '#0ea5a0', radius: 'md' as ThemeRadiusId, font: 'system' as ThemeFontId };

export default function TemplatesPage() {
  const [rows, setRows] = useState<ThemePresetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ rows: ThemePresetSummary[] }>('/v1/platform/theme-templates')
      .then((d) => setRows(d.rows))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load templates.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(): Promise<void> {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (draft.id) await api.patch(`/v1/platform/theme-templates/${draft.id}`, draft);
      else await api.post('/v1/platform/theme-templates', draft);
      setDraft(null);
      load();
      setNotice('Template saved — tenants see it immediately in Appearance & theme.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the template.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api.del(`/v1/platform/theme-templates/${id}`);
      setConfirmDelete(null);
      load();
      setNotice('Template removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the template.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Theme Templates' }]} />
      <PageHeader
        title="Theme Templates"
        subtitle="Zojatech-owned template library. Tenants adopt these on their Appearance page and can fine-tune any value."
        actions={
          <Button onClick={() => { setDraft({ ...EMPTY }); setError(null); setNotice(null); }}><IconPlus size={14} /> New template</Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <div className="banner banner-ok"><IconCheck size={13} /> {notice}</div>}

      {draft && (
        <div className="card stack" style={{ marginBottom: 14, border: '1px dashed var(--lav)', background: '#fdfdff' }}>
          <h2 style={{ margin: 0 }}>{draft.id ? 'Edit template' : 'New template'}</h2>
          <div>
            <Label>Name (shown to tenants)</Label>
            <TextInput value={draft.name} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} placeholder="e.g. Warm sunset" />
          </div>
          <div>
            <Label>Short description</Label>
            <TextInput value={draft.description} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} placeholder="What vibe does this template fit?" />
          </div>
          <div className="theme-grid" style={{ marginTop: 4 }}>
            <div className="theme-field">
              <Label>Brand colour</Label>
              <div className="link-copy">
                <input type="color" aria-label="Brand colour" value={draft.primary} onChange={(e) => setDraft((d) => (d ? { ...d, primary: e.target.value } : d))} />
                <span className="swatch-hex">{draft.primary.toUpperCase()}</span>
              </div>
            </div>
            <div className="theme-field">
              <Label>Accent colour</Label>
              <div className="link-copy">
                <input type="color" aria-label="Accent colour" value={draft.accent} onChange={(e) => setDraft((d) => (d ? { ...d, accent: e.target.value } : d))} />
                <span className="swatch-hex">{draft.accent.toUpperCase()}</span>
              </div>
            </div>
            <div className="theme-field">
              <Label>Default corner radius</Label>
              <div className="segmented">
                {(['sm', 'md', 'lg'] as ThemeRadiusId[]).map((r) => (
                  <button key={r} type="button" className={`segment ${draft.radius === r ? 'active' : ''}`} onClick={() => setDraft((d) => (d ? { ...d, radius: r } : d))}>
                    {r === 'sm' ? 'Sharp' : r === 'md' ? 'Soft' : 'Rounded'}
                  </button>
                ))}
              </div>
            </div>
            <div className="theme-field">
              <Label>Default font</Label>
              <div className="segmented">
                {(['system', 'serif', 'mono'] as ThemeFontId[]).map((f) => (
                  <button key={f} type="button" className={`segment ${draft.font === f ? 'active' : ''}`} onClick={() => setDraft((d) => (d ? { ...d, font: f } : d))}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={busy || !draft.name.trim()} onClick={() => void save()}>
              {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Create template'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="product-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 130 }}>
              <span className="sk" style={{ display: 'block', width: '60%', height: 14 }} />
              <span className="sk" style={{ display: 'block', width: '85%', height: 11, marginTop: 8 }} />
              <span className="sk" style={{ display: 'block', width: '40%', height: 11, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="muted">No templates yet — create the first one above.</p>
      ) : (
        <div className="product-grid">
          {rows.map((t) => (
            <div key={t.id} className="card stack" style={{ gap: 8 }}>
              <div className="tpl-preview" style={{ background: `linear-gradient(120deg, ${t.primary}22, #fff 70%)`, borderTop: `4px solid ${t.primary}` }}>
                <span className="color-dots">
                  <i style={{ background: t.primary }} />
                  <i style={{ background: t.accent }} />
                </span>
                <span className="strong">{t.name}</span>
                <span className="muted small">radius {t.radius} · font {t.font}</span>
                <span className="chip chip-approved">{t.builtin ? 'Built-in' : 'Custom'}</span>
              </div>
              <p className="muted small" style={{ margin: 0 }}>{t.description || 'No description.'}</p>
              <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                <Button variant="outline" className="btn-xs" onClick={() => { setDraft({ id: t.id, name: t.name, description: t.description, primary: t.primary, accent: t.accent, radius: t.radius, font: t.font }); setError(null); setNotice(null); }}>
                  Edit
                </Button>
                <KebabMenu
                  label={`Actions for ${t.name}`}
                  actions={[
                    {
                      id: 'delete',
                      label: t.builtin ? 'Delete template' : 'Delete template',
                      danger: true,
                      onSelect: () => setConfirmDelete(t.id),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete ? 'Delete template?' : 'Delete template?'}
        body={
          confirmDelete ? (
            <p style={{ margin: 0 }}>
              <strong>{rows.find((r) => r.id === confirmDelete)?.name}</strong> will be removed from the catalogue. Products that adopted it
              keep their current look — only the template entry disappears. This cannot be undone.
            </p>
          ) : null
        }
        confirmLabel="Delete template"
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void remove(confirmDelete);
        }}
      />
    </div>
  );
}
