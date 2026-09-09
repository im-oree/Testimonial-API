/**
 * Designs — every product's widget design in one gallery (DOC 7C §1–2,
 * mapped to the one-design-per-product model).
 *
 * Each card is a product: a live preview of the design its embed serves,
 * the design's name and shape, a badge when an unpublished draft is waiting,
 * and the actions that matter — open the studio, publish or discard the
 * draft, jump to the embed code. "New design" routes to the three ways in:
 * the template gallery, the builder wizard or the AI studio.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary } from '../lib/types';
import type { StudioSchema } from '../design-studio/types';
import { TemplatePreview } from '../components/TemplatePreview';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { ConfirmDialog, KebabMenu, type MenuAction } from '../components/menu';
import Modal from '../components/Modal';
import { IconEdit, IconLayers, IconPlus, IconStar } from '../components/icons';
import { toast } from '../components/Toast';

export default function DesignsPage() {
  const navigate = useNavigate();

  const [apps, setApps] = useState<AppSummary[] | null>(null);
  const [schemas, setSchemas] = useState<Record<string, StudioSchema | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<AppSummary | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<AppSummary | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((appsRes) => {
        setApps(appsRes.rows);
        // Each product's live design schema, for the mini previews.
        return Promise.all(
          appsRes.rows.map((a) =>
            api
              .get<{ schema: StudioSchema | null }>(`/v1/dashboard/apps/${a.id}/design/schema`)
              .then((d) => [a.id, d.schema] as const)
              .catch(() => [a.id, null] as const),
          ),
        ).then((pairs) => {
          const map: Record<string, StudioSchema | null> = {};
          for (const [id, schema] of pairs) map[id] = schema;
          setSchemas(map);
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your designs.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string): void {
    toast(msg);
  }

  async function publishDraft(app: AppSummary): Promise<void> {
    setBusyId(app.id);
    setError(null);
    try {
      await api.post(`/v1/dashboard/apps/${app.id}/design/draft/publish`);
      setConfirmPublish(null);
      flash(`Draft published — ${app.name}'s embed now serves the new design.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the draft.');
    } finally {
      setBusyId(null);
    }
  }

  async function discardDraft(app: AppSummary): Promise<void> {
    setBusyId(app.id);
    setError(null);
    try {
      await api.del(`/v1/dashboard/apps/${app.id}/design/draft`);
      setConfirmDiscard(null);
      flash(`Draft discarded — ${app.name}'s live design is untouched.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard the draft.');
    } finally {
      setBusyId(null);
    }
  }

  function rowMenu(app: AppSummary): MenuAction[] {
    const actions: MenuAction[] = [
      { id: 'studio', label: 'Open studio', onSelect: () => navigate(`/app/a/${app.id}/studio`) },
      { id: 'embed', label: 'Embed code', onSelect: () => navigate(`/app/a/${app.id}/embed`) },
    ];
    if (app.designDraft) {
      actions.push({ id: 'publish', label: 'Publish draft', onSelect: () => setConfirmPublish(app) });
      actions.push({ id: 'discard', label: 'Discard draft', onSelect: () => setConfirmDiscard(app), danger: true });
    }
    return actions;
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Designs' }]} />
      <PageHeader
        title="Designs"
        subtitle="One design per product — preview them all here, publish drafts when they're ready."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <IconPlus /> New design
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {!apps && (
        <div className="tpl-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card tpl-card">
              <div className="tpl-card-preview"><span className="sk tpl-preview-sk" /></div>
              <div className="tpl-card-body">
                <span className="sk" style={{ display: 'block', width: '55%', height: 15 }} />
                <span className="sk" style={{ display: 'block', width: '75%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {apps && apps.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="muted" style={{ marginTop: 0 }}>No products yet — a design belongs to a product.</p>
          <Link className="btn" to="/app/products">Create your first product</Link>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div className="tpl-grid">
          {apps.map((app) => {
            const schema = schemas[app.id] ?? null;
            return (
              <div key={app.id} className="card tpl-card">
                <div className="tpl-card-preview">
                  {schema ? (
                    <TemplatePreview schema={schema} />
                  ) : (
                    <div className="design-empty">
                      <span className="muted small">No design yet — pick a template to start</span>
                    </div>
                  )}
                  {app.designDraft && <span className="tpl-draft-badge">Draft ready</span>}
                </div>
                <div className="tpl-card-body">
                  <div className="tpl-card-title">
                    <span className="strong">{app.name}</span>
                    {schema && <span className="chip">{schema.behavior?.mode ?? 'static'}</span>}
                  </div>
                  <p className="muted small tpl-card-desc">
                    {schema ? schema.name : 'No design applied yet.'}
                    {schema && ` · ${schema.canvas.width} × ${schema.canvas.height}`}
                  </p>
                  <div className="tpl-use-actions">
                    <Link className="btn btn-sm" to={`/app/a/${app.id}/studio`}>
                      Open studio
                    </Link>
                    <KebabMenu actions={rowMenu(app)} label={`Actions for ${app.name}'s design`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New design: the three ways in */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} width={520}>
        <div className="tpl-use-head">
          <h2 style={{ margin: 0, fontSize: 17 }}>New design</h2>
          <Button variant="ghost" className="btn-xs" onClick={() => setNewOpen(false)} aria-label="Close">
            ✕
          </Button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Every design belongs to one product — you'll pick it in the next step.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          <Link className="design-path" to="/app/templates" onClick={() => setNewOpen(false)}>
            <span className="design-path-ic"><IconStar size={16} /></span>
            <span>
              <span className="strong" style={{ display: 'block' }}>Start from a template</span>
              <span className="muted small">30 ready-made designs — apply one as-is or customise it</span>
            </span>
          </Link>
          <Link className="design-path" to="/app/builder" onClick={() => setNewOpen(false)}>
            <span className="design-path-ic"><IconLayers size={16} /></span>
            <span>
              <span className="strong" style={{ display: 'block' }}>Use the builder</span>
              <span className="muted small">Four guided steps — template, content, style, publish</span>
            </span>
          </Link>
          <Link className="design-path" to="/app/ai" onClick={() => setNewOpen(false)}>
            <span className="design-path-ic"><IconEdit size={16} /></span>
            <span>
              <span className="strong" style={{ display: 'block' }}>Generate with AI</span>
              <span className="muted small">Describe it in words and get a finished design</span>
            </span>
          </Link>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmPublish !== null}
        title={`Publish the draft for ${confirmPublish?.name ?? 'this product'}?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            The live embed switches to the draft design immediately. The previous design is replaced.
          </p>
        }
        confirmLabel="Publish draft"
        busy={busyId === confirmPublish?.id}
        onConfirm={() => confirmPublish && void publishDraft(confirmPublish)}
        onCancel={() => setConfirmPublish(null)}
      />

      <ConfirmDialog
        open={confirmDiscard !== null}
        title={`Discard the draft for ${confirmDiscard?.name ?? 'this product'}?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            The unpublished draft is deleted. The live design and its embed stay exactly as they are.
          </p>
        }
        confirmLabel="Discard draft"
        busy={busyId === confirmDiscard?.id}
        onConfirm={() => confirmDiscard && void discardDraft(confirmDiscard)}
        onCancel={() => setConfirmDiscard(null)}
      />
    </div>
  );
}
