/**
 * One app — testimonial management (the product's content page).
 *
 * Everything a team needs to run its review wall, arranged by importance:
 *   · toolbar   : status filter + search first, the primary "New" action top right
 *   · table     : author · rating · content (expandable) · status · live toggle · received
 *   · row actions: one kebab (⋮) menu per row — edits and status moves first,
 *                 delete last behind a confirmation so it can never be mis-clicked
 *   · bulk bar  : select rows (or the whole page) → approve / reject / archive /
 *                 show / hide / delete in one go; destructive steps confirm
 *   · pagination: 7 per page by default (long lists never load at once), with
 *                 numbered pages, prev/next and a "show more per page" choice
 * The edit dialog is a compact two-column form sized to fit the viewport —
 * what you are editing is always visible without scrolling.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import { useAuth } from '../auth';
import type { Paged, Testimonial, TestimonialStatus } from '../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, Pager, RatingStars, StatusChip, Toggle } from '../components/ui';
import { Field, SelectField, TextAreaInput, TextInput } from '../components/fields';
import { ConfirmDialog, KebabMenu, type MenuAction } from '../components/menu';
import Modal from '../components/Modal';
import { IconCheck, IconEye, IconEyeOff, IconLayers, IconPlus, IconTrash, IconX } from '../components/icons';

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'archived';

const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected', 'archived'];
const PAGE_SIZES = [7, 15, 30];
const DEFAULT_PAGE_SIZE = 7;

/** Draft shape shared by the create + edit dialog. */
interface Draft {
  id?: string;
  authorName: string;
  rating: number;
  content: string;
  status: TestimonialStatus;
  visible: boolean;
  tags: string;
}

const EMPTY_DRAFT: Draft = { authorName: '', rating: 5, content: '', status: 'approved', visible: true, tags: '' };

export default function TestimonialsPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const { permissions } = useAuth();
  const canWrite = permissions.includes('testimonials.write');
  const canModerate = permissions.includes('testimonials.moderate');

  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Row-level work
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Testimonial | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [okNote, setOkNote] = useState<string | null>(null);

  // Bulk work
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | 'delete' | 'reject'>(null);

  const load = useCallback(
    (activeFilter: Filter, query: string, activePage: number, size: number) => {
      if (!appId) return;
      setLoading(true);
      const params = new URLSearchParams({ status: activeFilter, page: String(activePage), perPage: String(size) });
      if (query.trim()) params.set('q', query.trim());
      api
        .get<Paged<Testimonial>>(`/v1/apps/${appId}/testimonials?${params}`)
        .then((data) => {
          setRows(data.rows);
          setTotal(data.total);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load testimonials.'))
        .finally(() => setLoading(false));
    },
    [appId],
  );

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    load('all', '', 1, DEFAULT_PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  function applySearch(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
    setSelected(new Set());
    load(filter, q, 1, perPage);
  }
  function applyFilter(f: Filter): void {
    setFilter(f);
    setPage(1);
    setSelected(new Set());
    load(f, q, 1, perPage);
  }
  function gotoPage(p: number): void {
    setPage(p);
    setSelected(new Set());
    load(filter, q, p, perPage);
  }
  function changePerPage(n: number): void {
    setPerPage(n);
    setPage(1);
    setSelected(new Set());
    load(filter, q, 1, n);
  }
  function refresh(): void {
    load(filter, q, page, perPage);
  }
  function flash(msg: string): void {
    setOkNote(msg);
    window.setTimeout(() => setOkNote((cur) => (cur === msg ? null : cur)), 2200);
  }

  // ---- selection helpers -------------------------------------------------
  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleAll(): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- actions -----------------------------------------------------------
  async function saveDraft(): Promise<void> {
    if (!draft) return;
    setDraftBusy(true);
    setError(null);
    const body = {
      authorName: draft.authorName.trim() || null,
      rating: draft.rating || null,
      content: draft.content,
      status: draft.status,
      visible: draft.visible,
      tags: draft.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (draft.id) await api.patch<Testimonial>(`/v1/apps/${appId}/testimonials/${draft.id}`, body);
      else await api.post<Testimonial>(`/v1/apps/${appId}/testimonials`, body);
      setDraft(null);
      flash(draft.id ? 'Testimonial updated' : 'Testimonial added');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the testimonial.');
    } finally {
      setDraftBusy(false);
    }
  }

  async function setLive(t: Testimonial, visible: boolean): Promise<void> {
    setBusyId(t.id);
    setError(null);
    try {
      await api.patch(`/v1/apps/${appId}/testimonials/${t.id}`, { visible });
      setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, visible } : r)));
      flash(visible ? 'Now live on the wall' : 'Hidden from the wall');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the live state.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(t: Testimonial, status: TestimonialStatus): Promise<void> {
    setBusyId(t.id);
    setError(null);
    try {
      await api.patch<Testimonial>(`/v1/apps/${appId}/testimonials/${t.id}`, { status });
      setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, status } : r)));
      flash(`Moved to ${status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the status.');
    } finally {
      setBusyId(null);
    }
  }

  async function removeOne(): Promise<void> {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await api.del(`/v1/apps/${appId}/testimonials/${confirmDelete.id}`);
      setConfirmDelete(null);
      flash('Testimonial deleted');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the testimonial.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function bulk(action: 'approve' | 'reject' | 'archive' | 'show' | 'hide' | 'delete'): Promise<void> {
    setBulkBusy(true);
    setError(null);
    try {
      await api.post(`/v1/apps/${appId}/testimonials/bulk`, { action, ids: [...selected] });
      setSelected(new Set());
      setConfirmBulk(null);
      flash(`Bulk ${action} done`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That bulk action failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  // ---- render helpers -----------------------------------------------------
  function rowMenu(t: Testimonial): MenuAction[] {
    const actions: MenuAction[] = [];
    if (canWrite)
      actions.push({
        id: 'edit',
        label: 'Edit testimonial',
        icon: <IconCheck size={14} />,
        onSelect: () =>
          setDraft({
            id: t.id,
            authorName: t.authorName ?? '',
            rating: t.rating ?? 0,
            content: t.content,
            status: t.status,
            visible: t.visible !== false,
            tags: t.tags.join(', '),
          }),
      });
    if (t.status === 'approved')
      actions.push({
        id: 'live',
        label: t.visible !== false ? 'Hide from wall' : 'Show on wall',
        icon: t.visible !== false ? <IconEyeOff size={14} /> : <IconEye size={14} />,
        disabled: !canWrite || busyId === t.id,
        onSelect: () => void setLive(t, t.visible === false),
      });
    if (canModerate) {
      if (t.status !== 'approved')
        actions.push({ id: 'approve', label: 'Approve', icon: <IconCheck size={14} />, disabled: busyId === t.id, onSelect: () => void changeStatus(t, 'approved') });
      if (t.status !== 'rejected')
        actions.push({ id: 'reject', label: 'Reject', icon: <IconX size={14} />, disabled: busyId === t.id, onSelect: () => void changeStatus(t, 'rejected') });
      if (t.status !== 'archived')
        actions.push({ id: 'archive', label: 'Archive', icon: <IconLayers size={14} />, disabled: busyId === t.id, onSelect: () => void changeStatus(t, 'archived') });
    }
    if (canModerate)
      actions.push({
        id: 'delete',
        label: 'Delete…',
        icon: <IconTrash size={14} />,
        danger: true,
        onSelect: () => setConfirmDelete(t),
      });
    return actions;
  }

  const nothingEditable = !canWrite && !canModerate;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Testimonials' },
        ]}
      />
      <PageHeader
        title="Testimonials"
        subtitle={`${total} review${total === 1 ? '' : 's'} in this product${filter !== 'all' ? ` · filtered to ${filter}` : ''}`}
        actions={
          canWrite && (
            <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
              <IconPlus size={14} /> New testimonial
            </Button>
          )
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {okNote && (
        <div className="banner banner-ok" role="status">
          <span>
            <IconCheck size={13} /> {okNote}
          </span>
        </div>
      )}

      <div className="toolbar">
        <div className="segmented">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`segment ${filter === f ? 'active' : ''}`}
              onClick={() => {
                applyFilter(f);
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <form onSubmit={applySearch} className="search-form">
          <input
            className="input"
            type="search"
            placeholder="Search author, text or tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
      </div>

      {loading && <SkeletonTestimonialTable rows={Math.min(perPage, 7)} selectable={!nothingEditable} />}

      {!loading && rows.length === 0 && (
        <EmptyState
          title={q || filter !== 'all' ? 'No testimonials match' : 'No testimonials yet'}
          hint={
            q || filter !== 'all'
              ? 'Try a different filter or clear the search.'
              : canWrite
                ? 'Add the first one yourself, or publish a form and let customers write it.'
                : 'Reviews collected from public forms land here.'
          }
        />
      )}

      {!loading && rows.length > 0 && (
        <>
          {selected.size > 0 && (
            <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
              <span className="strong small">
                {selected.size} selected
                {allOnPageSelected && pageIds.length < total ? ` (this page)` : ''}
              </span>
              <span className="bulk-actions">
                {canModerate && (
                  <>
                    <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => void bulk('approve')}>
                      <IconCheck size={12} /> Approve
                    </Button>
                    <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => setConfirmBulk('reject')}>
                      Reject
                    </Button>
                    <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => void bulk('archive')}>
                      Archive
                    </Button>
                  </>
                )}
                {canWrite && (
                  <>
                    <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => void bulk('show')}>
                      <IconEye size={12} /> Show on wall
                    </Button>
                    <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => void bulk('hide')}>
                      <IconEyeOff size={12} /> Hide from wall
                    </Button>
                  </>
                )}
                {canModerate && (
                  <Button variant="danger" className="btn-xs" disabled={bulkBusy} onClick={() => setConfirmBulk('delete')}>
                    <IconTrash size={12} /> Delete
                  </Button>
                )}
                <Button variant="ghost" className="btn-xs" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </span>
            </div>
          )}

          <div className="card table-card">
            <table className="table t-table">
              <thead>
                <tr>
                  {!nothingEditable && (
                    <th className="t-check">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={allOnPageSelected}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  <th>Author</th>
                  <th>Rating</th>
                  <th className="t-content">Content</th>
                  <th>Status</th>
                  <th>On wall</th>
                  <th>Received</th>
                  {!nothingEditable && <th className="t-menu" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const open = expanded === t.id;
                  const live = t.visible !== false;
                  return (
                    <tr key={t.id} className={selected.has(t.id) ? 'is-selected' : ''}>
                      {!nothingEditable && (
                        <td className="t-check">
                          <input
                            type="checkbox"
                            aria-label={`Select review by ${t.authorName ?? 'anonymous'}`}
                            checked={selected.has(t.id)}
                            onChange={() => toggleOne(t.id)}
                          />
                        </td>
                      )}
                      <td>
                        <div className="strong">{t.authorName ?? 'Anonymous'}</div>
                        {t.tags.length > 0 && <div className="muted small">{t.tags.join(', ')}</div>}
                      </td>
                      <td>{t.rating ? <RatingStars value={t.rating} size="sm" /> : <span className="muted">—</span>}</td>
                      <td className="t-content">
                        <button
                          type="button"
                          className={`t-content-toggle ${open ? 'open' : ''}`}
                          onClick={() => setExpanded(open ? null : t.id)}
                          aria-expanded={open}
                        >
                          <span className={open ? '' : 'clamp-2'}>{t.content}</span>
                          <span className="t-content-more muted small">{open ? 'Show less' : 'Read all'}</span>
                        </button>
                      </td>
                      <td>
                        <StatusChip status={t.status} />
                      </td>
                      <td>
                        {t.status === 'approved' ? (
                          canWrite ? (
                            <span className="t-live">
                              <Toggle checked={live} disabled={busyId === t.id} onChange={(v) => void setLive(t, v)} />
                              <span className={`small ${live ? 't-live-on' : 'muted'}`}>{live ? 'Live' : 'Hidden'}</span>
                            </span>
                          ) : (
                            <span className={`chip ${live ? 'chip-approved' : 'chip-draft'}`}>{live ? 'Live' : 'Hidden'}</span>
                          )
                        ) : (
                          <span className="muted small" title="Approve it first, then switch it live">
                            —
                          </span>
                        )}
                      </td>
                      <td className="muted small">{timeAgo(t.createdAt)}</td>
                      {!nothingEditable && (
                        <td className="t-menu">
                          <KebabMenu actions={rowMenu(t)} label={`Actions for ${t.authorName ?? 'anonymous'}'s review`} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pager
            page={page}
            pageCount={Math.ceil(total / perPage)}
            total={total}
            perPage={perPage}
            perPageOptions={PAGE_SIZES}
            onChange={gotoPage}
            onPerPageChange={changePerPage}
          />
        </>
      )}

      {!loading && nothingEditable && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Your role has read-only access to testimonials.
        </p>
      )}

      {/* Create / edit dialog — compact two-column layout, fully visible without scrolling */}
      <Modal open={draft !== null} onClose={() => setDraft(null)} width={720}>
        {draft && (
          <div className="t-edit">
            <div className="modal-head">
              <h2>{draft.id ? 'Edit testimonial' : 'New testimonial'}</h2>
              <Button variant="ghost" className="btn-xs" onClick={() => setDraft(null)} aria-label="Close">
                ✕
              </Button>
            </div>
            <div className="t-edit-body">
              <div className="t-edit-left">
                <Field label="Reviewer name">
                  <TextInput
                    value={draft.authorName}
                    placeholder="e.g. Ada Okafor"
                    onChange={(e) => setDraft({ ...draft, authorName: e.target.value })}
                  />
                </Field>
                <Field label="Rating">
                  <RatingStars value={draft.rating || 0} onChange={(v) => setDraft({ ...draft, rating: v })} size="lg" />
                </Field>
                <Field label="Status" hint={draft.id ? 'Moving between states is moderation work.' : undefined}>
                  <SelectField
                    value={draft.status}
                    disabled={draft.id !== undefined && !canModerate}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as TestimonialStatus })}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </SelectField>
                </Field>
                <Field label="Live on wall" hint={draft.status === 'approved' ? undefined : 'Only approved reviews can go live.'}>
                  <span className="t-live">
                    <Toggle
                      checked={draft.visible && draft.status === 'approved'}
                      disabled={draft.status !== 'approved'}
                      onChange={(v) => setDraft({ ...draft, visible: v })}
                    />
                    <span className={`small ${draft.visible && draft.status === 'approved' ? 't-live-on' : 'muted'}`}>
                      {draft.visible && draft.status === 'approved' ? 'Shown on the public wall' : 'Not shown'}
                    </span>
                  </span>
                </Field>
                <Field label="Tags" hint="Comma separated — e.g. website, product">
                  <TextInput value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
                </Field>
              </div>
              <div className="t-edit-right">
                <Field label="What they said" required>
                  <TextAreaInput
                    rows={9}
                    value={draft.content}
                    placeholder="Paste or write the review text…"
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  />
                </Field>
                <span className="muted small t-count">{draft.content.length} / 2000</span>
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={() => setDraft(null)} disabled={draftBusy}>
                Cancel
              </Button>
              <Button type="button" disabled={draftBusy || !draft.content.trim()} onClick={() => void saveDraft()}>
                {draftBusy ? 'Saving…' : draft.id ? 'Save changes' : 'Add testimonial'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation — destructive work is never a single mis-click */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this testimonial?"
        body={
          confirmDelete && (
            <p className="muted" style={{ margin: 0 }}>
              The review by <strong>{confirmDelete.authorName ?? 'Anonymous'}</strong> will be permanently removed from this
              product, the moderation queue and the public wall.
            </p>
          )
        }
        confirmLabel="Delete testimonial"
        busy={deleteBusy}
        onConfirm={() => void removeOne()}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulk !== null}
        title={confirmBulk === 'delete' ? `Delete ${selected.size} testimonials?` : `Reject ${selected.size} testimonials?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            {confirmBulk === 'delete'
              ? 'The selected reviews will be permanently removed. This cannot be undone.'
              : 'The selected reviews will be marked rejected and pulled from every public surface.'}
          </p>
        }
        confirmLabel={confirmBulk === 'delete' ? `Delete ${selected.size}` : `Reject ${selected.size}`}
        busy={bulkBusy}
        onConfirm={() => void bulk(confirmBulk === 'delete' ? 'delete' : 'reject')}
        onCancel={() => setConfirmBulk(null)}
      />
    </div>
  );
}

/** Skeleton that mirrors the real table: same columns, same row rhythm. */
function SkeletonTestimonialTable({ rows = 7, selectable = true }: { rows?: number; selectable?: boolean }) {
  return (
    <div className="card table-card" aria-busy="true" aria-label="Loading testimonials">
      <table className="table t-table">
        <thead>
          <tr>
            {selectable && (
              <th className="t-check">
                <span className="sk" style={{ width: 13, height: 13 }} />
              </th>
            )}
            <th>Author</th>
            <th>Rating</th>
            <th className="t-content">Content</th>
            <th>Status</th>
            <th>On wall</th>
            <th>Received</th>
            {selectable && <th className="t-menu" />}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {selectable && (
                <td className="t-check">
                  <span className="sk" style={{ width: 13, height: 13 }} />
                </td>
              )}
              <td>
                <span className="sk" style={{ width: `${70 + ((i * 13) % 20)}%`, height: 12 }} />
                <span className="sk" style={{ width: '50%', height: 9, marginTop: 5 }} />
              </td>
              <td>
                <span className="sk" style={{ width: 58, height: 12 }} />
              </td>
              <td className="t-content">
                <span className="sk" style={{ width: '92%', height: 11 }} />
                <span className="sk" style={{ width: '74%', height: 11, marginTop: 5 }} />
              </td>
              <td>
                <span className="sk" style={{ width: 54, height: 17, borderRadius: 999 }} />
              </td>
              <td>
                <span className="sk" style={{ width: 46, height: 17, borderRadius: 999 }} />
              </td>
              <td>
                <span className="sk" style={{ width: 44, height: 11 }} />
              </td>
              {selectable && (
                <td className="t-menu">
                  <span className="sk" style={{ width: 18, height: 18, borderRadius: 6 }} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
