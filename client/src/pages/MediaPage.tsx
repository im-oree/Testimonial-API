/**
 * Media library (DOC 7C §8) — the images a team keeps for its designs.
 *
 * Assets are saved by URL: add any hosted image, find it instantly, copy the
 * URL into the studio's image element. Deleting an asset only removes it
 * from the library — designs keep rendering because they store the URL
 * themselves.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { Field, TextInput } from '../components/fields';
import { ConfirmDialog, KebabMenu } from '../components/menu';
import { IconClipboard, IconPlus, IconSearch } from '../components/icons';

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ rows: MediaAsset[] }>('/v1/media')
      .then((d) => setAssets(d.rows))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the media library.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string): void {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  }

  async function add(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api.post('/v1/media', { name, url });
      setAdding(false);
      setName('');
      setUrl('');
      flash('Image saved to your library.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the image.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(): Promise<void> {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.del(`/v1/media/${confirmDelete.id}`);
      setConfirmDelete(null);
      flash('Removed from the library.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the asset.');
    } finally {
      setBusy(false);
    }
  }

  function copy(asset: MediaAsset): void {
    void navigator.clipboard?.writeText(asset.url);
    flash('URL copied.');
  }

  const rows = (assets ?? []).filter((a) => {
    const q = search.trim().toLowerCase();
    return q === '' || a.name.toLowerCase().includes(q) || a.url.toLowerCase().includes(q);
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Media' }]} />
      <PageHeader
        title="Media"
        subtitle="Your team's saved images — logos, avatars, photos — one click from any design."
        actions={
          <Button onClick={() => setAdding((v) => !v)}>
            <IconPlus /> Add image
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {notice && (
        <div className="banner banner-ok" role="status">
          {notice}
        </div>
      )}

      {adding && (
        <div className="card media-add">
          <div className="f-group f-group-2">
            <Field label="Image URL" hint="Any hosted image (https://…/photo.jpg).">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://cdn.example.com/logo.png" aria-label="Image URL" />
            </Field>
            <Field label="Name (optional)">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Company logo" aria-label="Asset name" />
            </Field>
          </div>
          {url && (
            <div className="media-add-preview">
              <img src={url} alt="Preview" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.15')} onLoad={(e) => ((e.target as HTMLImageElement).style.opacity = '1')} />
              <span className="muted small">{url}</span>
            </div>
          )}
          <div className="tpl-use-actions">
            <Button disabled={!url.trim() || busy} onClick={() => void add()}>
              {busy ? 'Saving…' : 'Save to library'}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="market-toolbar">
        <div className="market-search">
          <IconSearch size={14} />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search images…" aria-label="Search images" />
        </div>
      </div>

      {!assets && (
        <div className="media-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card media-card">
              <span className="sk" style={{ display: 'block', height: 120, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      )}

      {assets && rows.length === 0 && (
        <div className="card" style={{ padding: '38px 20px', textAlign: 'center' }}>
          <p className="muted" style={{ marginTop: 0 }}>
            {assets.length === 0 ? 'No images saved yet — add the ones your designs use.' : 'Nothing matches that search.'}
          </p>
        </div>
      )}

      {assets && rows.length > 0 && (
        <div className="media-grid">
          {rows.map((a) => (
            <div key={a.id} className="card media-card">
              <div className="media-thumb">
                <img src={a.url} alt={a.name} loading="lazy" />
              </div>
              <div className="media-card-body">
                <span className="strong small" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
                <span className="muted small" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <div className="tpl-use-actions" style={{ marginTop: 8 }}>
                  <Button variant="secondary" className="btn-sm" onClick={() => copy(a)}>
                    <IconClipboard size={12} /> Copy URL
                  </Button>
                  <KebabMenu
                    actions={[
                      { id: 'copy', label: 'Copy URL', onSelect: () => copy(a) },
                      { id: 'del', label: 'Remove from library', onSelect: () => setConfirmDelete(a), danger: true },
                    ]}
                    label={`Actions for ${a.name}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Remove ${confirmDelete?.name ?? 'this image'} from the library?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            It only leaves your saved list — designs already using its URL keep rendering it.
          </p>
        }
        confirmLabel="Remove"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
