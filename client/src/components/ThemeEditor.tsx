/**
 * ThemeEditor — one editor used by the platform console (Zojatech manages a
 * tenant's theme) AND by the tenant's own settings (self-service). Tailwind-
 * presets-ish: pick a preset to seed the tokens, then fine-tune brand colour,
 * accent, corner radius and font. Everything is saved server-side; the public
 * form/wall/widgets read the pre-resolved theme, so edits reflect immediately
 * on the next page load with zero extra request churn.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { fetchThemePresets, matchingPreset, softOf, textOn, RADIUS_OPTIONS, FONT_OPTIONS } from '../lib/theme';
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
  /** Current theme tokens (or null while loading). */
  initial: Partial<ResolvedTheme> | null;
  initialLogo?: string | null;
  /** Fired after a successful save with the server's fresh state. */
  onSaved?: (res: ThemeSaveResponse) => void;
}

const FALLBACK: Draft = { presetId: 'midnight', primary: '#1b2559', accent: '#0ea5a0', radius: 'md', font: 'system' };

export default function ThemeEditor({ endpoint, initial, initialLogo = null, onSaved }: Props) {
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

  const sampleBtn = textOn(draft.primary);

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
      <div className="theme-presets" role="radiogroup" aria-label="Theme presets">
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
        </button>
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
              +
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
              +
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

        <div className="theme-field">
          <Label>Logo URL</Label>
          <TextInput value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://cdn.example.com/logo.png" />
        </div>
      </div>

      <div className="theme-bottom">
        <div className="theme-preview" style={{ '--pv-primary': draft.primary, '--pv-soft': softOf(draft.primary), '--pv-accent': draft.accent, borderRadius: RADIUS_OPTIONS.find((r) => r.id === draft.radius)?.px } as React.CSSProperties}>
          <div className="theme-preview-head">
            <span className="brand-dot" style={{ background: draft.primary }} />
            <span className="muted small">Acme Inc · live preview</span>
          </div>
          {logo ? (
            <img src={logo} alt="Logo preview" className="theme-preview-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          ) : (
            <span className="theme-preview-title">Real reviews on your site</span>
          )}
          <span className="btn-pv" style={{ background: draft.primary, color: sampleBtn }}>
            Add a Review +
          </span>
        </div>

        <div className="theme-actions">
          {error && <span className="muted small" style={{ color: 'var(--bad)' }}>{error}</span>}
          {savedAt && !error && <span className="muted small" style={{ color: 'var(--good)' }}>✓ Saved — public pages &amp; embeds use it now.</span>}
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save theme'}
          </Button>
        </div>
      </div>
    </div>
  );
}
