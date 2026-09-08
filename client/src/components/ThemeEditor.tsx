/**
 * ThemeEditor — one editor used by the platform console (Zojatech manages a
 * tenant's theme) AND by the tenant's own settings (self-service). Tailwind-
 * presets-ish: pick a preset to seed the tokens, then fine-tune brand colour,
 * accent, corner radius, font and logo. Everything is saved server-side; the
 * public form/wall chrome reads the pre-resolved theme, so edits reflect
 * immediately on the next page load with zero extra request churn.
 *
 * Save lives in a sticky bar at the very top — always visible, never buried
 * under content. (The old right-hand "live preview" of the pre-template
 * widget designs is gone: product widgets are template-based now, designed
 * per product in the design studio.)
 *
 * Layout is organised in two zones:
 *   1. Start from a template (Zojatech's live catalogue or keep Custom)
 *   2. Fine-tune the look (tokens + logo)
 */
import { IconCheck, IconPlus } from './icons';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fetchThemePresets, matchingPreset, RADIUS_OPTIONS, FONT_OPTIONS } from '../lib/theme';
import type { ResolvedTheme, ThemeFontId, ThemePresetSummary, ThemeRadiusId, ThemeSaveResponse } from '../lib/types';
import { Button, Label, TextInput } from './ui';

interface Draft {
  presetId: string;
  primary: string;
  accent: string;
  radius: ThemeRadiusId;
  font: ThemeFontId;
}

interface Props {
  /** API route that persists the theme (tenant or platform flavour). */
  endpoint: string;
  /** Company editor only: href to the design template marketplace (tier-1 gallery). */
  catalogueHref?: string;
  /** Current theme tokens (or null while loading). */
  initial: Partial<ResolvedTheme> | null;
  initialLogo?: string | null;
  /** Fired after a successful save with the server's fresh state. */
  onSaved?: (res: ThemeSaveResponse) => void;
}

const FALLBACK: Draft = { presetId: 'midnight', primary: '#1b2559', accent: '#0ea5a0', radius: 'md', font: 'system' };

export default function ThemeEditor({ endpoint, initial, initialLogo = null, onSaved, catalogueHref }: Props) {
  const [presets, setPresets] = useState<ThemePresetSummary[]>([]);
  const [presetsReady, setPresetsReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(FALLBACK);
  const [logo, setLogo] = useState<string>(initialLogo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setLogo(initialLogo ?? '');
    if (initial) {
      setDraft({
        presetId: initial.presetId ?? 'custom',
        primary: initial.primary ?? FALLBACK.primary,
        accent: initial.accent ?? FALLBACK.accent,
        radius: initial.radius ?? FALLBACK.radius,
        font: initial.font ?? FALLBACK.font,
      });
    }
  }, [initial?.presetId, initial?.primary, initial?.accent, initial?.radius, initial?.font, initial?.version, initialLogo]);

  useEffect(() => {
    let alive = true;
    fetchThemePresets().then((list) => {
      if (!alive) return;
      setPresets(list);
      setPresetsReady(true);
      // First paint with no tokens yet: default to the first preset.
      if (!initial) setDraft({ presetId: list[0]?.id ?? 'midnight', primary: list[0]?.primary ?? FALLBACK.primary, accent: list[0]?.accent ?? FALLBACK.accent, radius: list[0]?.radius ?? 'md', font: list[0]?.font ?? 'system' });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePreset = useMemo(() => (presetsReady ? matchingPreset(presets, draft) : draft.presetId), [presets, presetsReady, draft]);

  function applyPreset(p: ThemePresetSummary): void {
    setDraft({ presetId: p.id, primary: p.primary, accent: p.accent, radius: p.radius, font: p.font });
    setError(null);
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await api.patch<ThemeSaveResponse>(endpoint, {
        presetId: activePreset === 'custom' ? 'custom' : activePreset,
        primary: draft.primary,
        accent: draft.accent,
        radius: draft.radius,
        font: draft.font,
        logoUrl: logo.trim() || null,
      });
      setDraft({
        presetId: res.theme.presetId,
        primary: res.theme.primary,
        accent: res.theme.accent,
        radius: res.theme.radius,
        font: res.theme.font,
      });
      setLogo(res.logoUrl ?? '');
      setSavedAt(Date.now());
      onSaved?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the theme.');
    } finally {
      setBusy(false);
    }
  }

  if (!presetsReady) {
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="block-center" style={{ padding: '22px 0' }}>
          <span className="sk" style={{ display: 'block', width: '46%', height: 12, margin: '0 auto 8px' }} />
          <span className="sk" style={{ display: 'block', width: '70%', height: 12, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="theme-editor">
      {/* ---- Sticky save bar: the save button is always visible, up top ---- */}
      <div className="theme-savebar" role="region" aria-label="Save theme">
        <span className="theme-savebar-status">
          {error ? (
            <span className="small" style={{ color: 'var(--bad)' }}>{error}</span>
          ) : savedAt ? (
            <span className="small" style={{ color: 'var(--good)' }}>
              <IconCheck size={12} /> Saved — public pages &amp; embeds use it now.
            </span>
          ) : (
            <span className="muted small">Public forms, walls and embeds pick this up on their next load.</span>
          )}
        </span>
        <span className="chip" title="Theme version">v{initial?.version ?? 0}</span>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save theme'}
        </Button>
      </div>

      <section className="te-section">
        <div className="section-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>1 · Start from a template</h3>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Colour presets from Zojatech&apos;s live catalogue — new ones appear here instantly. Custom keeps what you have now.
            </p>
          </div>
          {catalogueHref && (
            <Link to={catalogueHref} className="btn btn-secondary btn-xs">
              Browse design templates
            </Link>
          )}
        </div>
        <div className="theme-presets" role="radiogroup" aria-label="Theme templates">
          {presets.map((p) => {
            const active = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                title={p.description}
                aria-pressed={active}
                className={`theme-preset ${active ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                <span className="color-dots">
                  <i style={{ background: p.primary }} />
                  <i style={{ background: p.accent }} />
                </span>
                <span className="small strong">{p.name}</span>
                <span className="muted small">{p.font} · {p.radius}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={activePreset === 'custom'}
            className={`theme-preset ${activePreset === 'custom' ? 'active' : ''}`}
            onClick={() => setError(null)}
          >
            <span className="color-dots custom-dot">
              <i style={{ background: draft.primary }} />
              <i style={{ background: draft.accent }} />
            </span>
            <span className="small strong">Custom</span>
            <span className="muted small">current tokens</span>
          </button>
        </div>
      </section>

      <section className="te-section">
        <div className="section-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>2 · Fine-tune the look</h3>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Every field below is saved as part of your company theme — public surfaces resolve it on load.
            </p>
          </div>
        </div>
        <div className="theme-grid">
          <div className="theme-field">
            <Label>Brand colour</Label>
            <div className="swatches">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Brand ${p.name}`}
                  className={`swatch ${draft.primary.toLowerCase() === p.primary.toLowerCase() ? 'active' : ''}`}
                  style={{ background: p.primary }}
                  onClick={() => setDraft((d) => ({ ...d, primary: p.primary, presetId: activePreset === 'custom' ? 'custom' : d.presetId }))}
                />
              ))}
              <label className="swatch swatch-custom" title="Custom brand colour">
                <input
                  type="color"
                  value={draft.primary}
                  onChange={(e) => setDraft((d) => ({ ...d, primary: e.target.value }))}
                />
                <IconPlus size={12} />
              </label>
              <span className="swatch-hex">{draft.primary.toUpperCase()}</span>
            </div>
          </div>

          <div className="theme-field">
            <Label>Accent colour</Label>
            <div className="swatches">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Accent ${p.name}`}
                  className={`swatch ${draft.accent.toLowerCase() === p.accent.toLowerCase() ? 'active' : ''}`}
                  style={{ background: p.accent }}
                  onClick={() => setDraft((d) => ({ ...d, accent: p.accent }))}
                />
              ))}
              <label className="swatch swatch-custom" title="Custom accent colour">
                <input type="color" value={draft.accent} onChange={(e) => setDraft((d) => ({ ...d, accent: e.target.value }))} />
                <IconPlus size={12} />
              </label>
              <span className="swatch-hex">{draft.accent.toUpperCase()}</span>
            </div>
          </div>

          <div className="theme-field">
            <Label>Corner radius</Label>
            <div className="segmented">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`segment ${draft.radius === r.id ? 'active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, radius: r.id }))}
                >
                  {r.label} · {r.px}
                </button>
              ))}
            </div>
          </div>

          <div className="theme-field">
            <Label>Font</Label>
            <div className="segmented">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`segment ${draft.font === f.id ? 'active' : ''}`}
                  style={{ fontFamily: f.stack }}
                  onClick={() => setDraft((d) => ({ ...d, font: f.id as ThemeFontId }))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="theme-field theme-field-wide">
            <Label>Logo URL</Label>
            <div className="theme-logo-row">
              <TextInput value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://cdn.example.com/logo.png" />
              {logo.trim() && (
                <img
                  src={logo.trim()}
                  alt="Logo preview"
                  className="theme-logo-thumb"
                  onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                  onLoad={(e) => ((e.target as HTMLImageElement).style.visibility = 'visible')}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
