/**
 * Company (tenant) workspace — Settings.
 *
 * This is a real settings area, not a menu of cards: workspace profile edits
 * land here (name is persisted via PATCH /v1/settings/workspace), the brand
 * identity is summarised with a link to the Appearance editor, billing/plan
 * and seats read from /v1/billing, and the most recent workspace activity is
 * shown inline (read from the workspace audit log). Navigation to the other
 * settings surfaces happens in the sidebar and via the section footer links —
 * the page itself always contains settings content.
 *
 * Appearance (theme tokens + logo) intentionally stays its own full editor at
 * /app/settings/theme; Account is your personal profile at /app/settings/account.
 */
import { IconCheck, IconClipboard, IconLayers, IconPalette } from '../components/icons';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate, timeAgo } from '../lib/format';
import { useAuth } from '../auth';
import type { AuditRow } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { Field, TextInput } from '../components/fields';

interface BillingSummary {
  plan: 'starter' | 'growth' | 'scale';
  status: string;
  seatsUsed: number;
  seatsLimit: number;
  monthlyCostUsd: number;
}

const PLAN_LABEL: Record<string, string> = { starter: 'Starter', growth: 'Growth', scale: 'Scale' };

function prettyAudit(action: string): string {
  return action.split('.').map((p) => (p.charAt(0).toUpperCase() + p.slice(1)).replace('_', ' ')).join(' · ');
}

export default function SettingsPage() {
  const { tenant, user, permissions, refresh } = useAuth();
  const canManage = permissions.includes('settings.manage');
  const canReadAudit = permissions.includes('audit.read');

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [recent, setRecent] = useState<AuditRow[]>([]);
  const [name, setName] = useState(tenant?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(tenant?.name ?? '');
  }, [tenant?.name]);

  useEffect(() => {
    api
      .get<BillingSummary>('/v1/billing')
      .then(setBilling)
      .catch(() => setBilling(null));
  }, []);

  useEffect(() => {
    if (!canReadAudit) return;
    api
      .get<{ rows: AuditRow[] }>('/v1/audit-logs?perPage=3')
      .then((d) => setRecent(d.rows))
      .catch(() => setRecent([]));
  }, [canReadAudit]);

  async function saveName(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.patch(`/v1/settings/workspace`, { name });
      setNotice('Workspace name saved.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the workspace name.');
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) return null;

  const primary = tenant.theme?.primary ?? tenant.brandColor ?? '#1b2559';
  const accent = tenant.theme?.accent ?? '#0ea5a0';
  const initials = (user?.name ?? tenant.name[0] ?? '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Settings' }]} />
      <PageHeader title="Settings" subtitle={`Workspace preferences and overview for ${tenant.name}.`} />

      {error && <ErrorBanner message={error} />}
      {notice && (
        <div className="banner banner-ok">
          <IconCheck size={13} /> {notice}
        </div>
      )}

      <div className="settings-stack">
        {/* Workspace profile — real, editable setting */}
        <section className="card settings-section">
          <div className="settings-head">
            <div className="settings-title">
              <span className="settings-ic"><IconLayers size={15} /></span>
              <div>
                <h2 style={{ margin: 0 }}>Workspace profile</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  The name shown to your customers on public pages and in the Zojatech console.
                </p>
              </div>
            </div>
            <span className="chip chip-tenant">{tenant.slug}</span>
          </div>
          <form className="settings-form" onSubmit={(e) => void saveName(e)}>
            <div className="f-group f-group-2">
              <Field label="Workspace name" hint={canManage ? 'Saved with the button on the right.' : 'Read-only in your role.'} htmlFor="ws-name">
                <TextInput id="ws-name" value={name} disabled={saving || !canManage} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
              <div>
                <Field label="Workspace ID" htmlFor="ws-id">
                  <TextInput id="ws-id" value={tenant.id} disabled readOnly />
                </Field>
              </div>
            </div>
            {canManage && (
              <div className="settings-form-actions">
                <Button type="submit" className="btn-sm" disabled={saving || !name.trim() || name.trim() === tenant.name}>
                  {saving ? 'Saving…' : 'Save name'}
                </Button>
              </div>
            )}
          </form>
          {billing && (
            <div className="settings-meta">
              <span className="muted small">
                Plan <strong>{PLAN_LABEL[billing.plan] ?? billing.plan}</strong> · ${billing.monthlyCostUsd}/mo
              </span>
              <span className="muted small">·</span>
              <span className="muted small">
                {billing.seatsUsed} of {billing.seatsLimit} seats used
              </span>
              <span className="muted small">· Plan and status are managed by Zojatech (platform).</span>
            </div>
          )}
        </section>

        {/* Brand identity summary */}
        <section className="card settings-section">
          <div className="settings-head">
            <div className="settings-title">
              <span className="settings-ic"><IconPalette size={15} /></span>
              <div>
                <h2 style={{ margin: 0 }}>Brand identity</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  Colours, font, corner radius and logo for your public surfaces.
                </p>
              </div>
            </div>
            <Link to="/app/settings/theme" className="btn btn-outline btn-sm">
              Open Appearance
            </Link>
          </div>
          <div className="settings-brand-row">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="ws-logo" style={{ width: 42, height: 42 }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span className="ws-avatar" style={{ background: primary, width: 42, height: 42, fontSize: 17 }}>
                {(tenant.name[0] ?? '?').toUpperCase()}
              </span>
            )}
            <div className="swatches">
              <span className="swatch" style={{ background: primary }} title={`Primary ${primary}`} />
              <span className="swatch" style={{ background: accent }} title={`Accent ${accent}`} />
            </div>
            <div className="muted small">
              <code>{primary.toUpperCase()}</code> primary · <code>{accent.toUpperCase()}</code> accent
            </div>
          </div>
        </section>

        {/* Your account */}
        <section className="card settings-section">
          <div className="settings-head">
            <div className="settings-title">
              <span className="settings-user-avatar">{initials}</span>
              <div>
                <h2 style={{ margin: 0 }}>Your account</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  {user?.email} · <span className={`chip chip-role chip-role-${user?.role === 'editor' ? 'lav' : user?.role === 'viewer' ? 'gray' : user?.role === 'admin' ? 'teal' : 'navy'}`}>{user?.role}</span>
                </p>
              </div>
            </div>
            <Link to="/app/settings/account" className="btn btn-outline btn-sm">
              Manage profile &amp; password
            </Link>
          </div>
        </section>

        {/* Recent activity */}
        {canReadAudit && (
          <section className="card settings-section">
            <div className="settings-head">
              <div className="settings-title">
                <span className="settings-ic"><IconClipboard size={15} /></span>
                <div>
                  <h2 style={{ margin: 0 }}>Recent activity</h2>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    Latest entries from this workspace’s audit log.
                  </p>
                </div>
              </div>
              <Link to="/app/audit" className="btn btn-outline btn-sm">
                Open audit log
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="muted small">No activity recorded yet.</p>
            ) : (
              <ul className="audit-list">
                {recent.map((row) => (
                  <li key={row.id} className="audit-row">
                    <div className="audit-marker">
                      <span className={`dot ${row.actor.toLowerCase() === 'system' ? 'dot-system' : 'dot-human'}`} />
                    </div>
                    <div className="audit-main">
                      <div className="strong small">{prettyAudit(row.action)}</div>
                      <div className="muted small">
                        by <span className="actor">{row.actor}</span>
                        {row.resource && <> · <code>{row.resource}</code></>}
                      </div>
                    </div>
                    <div className="muted small audit-time" title={formatDate(row.createdAt)}>{timeAgo(row.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
