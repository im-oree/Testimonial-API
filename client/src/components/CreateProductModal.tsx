/**
 * Create Product — animated setup wizard (modal).
 *   1. Details   : name, website URL + auto product ID/slug (mirrors server).
 *   2. Design    : accent colour + live preview of the review-collect surface.
 *   3. Ready     : created product with its public form & wall links.
 * The product is created server-side the moment the user leaves step 2; the
 * API provisions its public review form so links work immediately.
 */
import {IconCheck, IconStar, IconX, IconChevronLeft } from './icons';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary } from '../lib/types';
import { Button, Label, TextInput } from './ui';
import Modal from './Modal';

export function productCodePreview(name: string): string {
  const words = name.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const code = words.length > 1 ? words.map((w) => w[0]).join('') : words[0] ?? '';
  const letters = (code || name.replace(/[^a-zA-Z0-9]/g, '')).slice(0, 4).toUpperCase();
  return `PRD-${letters || 'PROD'}`;
}

export function slugPreview(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'product'
  );
}

const ACCENTS = ['#0ea5a0', '#1b2559', '#7c3aed', '#2563eb', '#0d9488', '#c026d3', '#e11d48', '#f59e0b'];

const STEPS = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Design & collect' },
];

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

export default function CreateProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (app: AppSummary) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ app: AppSummary; formSlug: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setName('');
      setWebsiteUrl('');
      setAccent(ACCENTS[0]);
      setError(null);
      setCreated(null);
      setCopied(null);
    }
  }, [open]);

  const canContinue = name.trim().length > 0;
  const code = productCodePreview(name);
  const slug = slugPreview(name);

  async function create(): Promise<void> {
    if (!canContinue || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ app: AppSummary; formSlug: string }>('/v1/apps', {
        name: name.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        accentColor: accent,
      });
      setCreated(res);
      onCreated(res.app);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the product.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — still show feedback, user can copy manually
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function reset(): void {
    setStep(1);
    setName('');
    setWebsiteUrl('');
    setAccent(ACCENTS[0]);
    setCreated(null);
    setError(null);
    setCopied(null);
  }

  const base = window.location.origin;
  const wallUrl = created ? `${base}/wall/${created.app.slug}` : `${base}/wall/${slug}`;
  const formUrl = created ? `${base}/forms/${created.formSlug}` : `${base}/forms/${slug}-review`;

  return (
    <Modal open={open} onClose={onClose} width={620}>
      {created ? (
        <motion.div className="stack" key="done" {...fadeUp}>
          <div className="success-row">
            <span className="success-check"><IconCheck size={26} /></span>
            <div>
              <h2 style={{ margin: 0 }}>{created.app.name} is live</h2>
              <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                Your product, its public review form and testimonial wall are ready — reviews start in the moderation queue.
              </p>
            </div>
          </div>

          <div className="ready-summary">
            <div className="ready-chip" style={{ background: accent, color: '#fff' }}>
              {created.app.code}
            </div>
            <div>
              <div className="strong">{created.app.name}</div>
              <div className="muted small">/{created.app.slug}</div>
            </div>
          </div>

          <div className="link-rows">
            <div className="link-row">
              <div>
                <div className="small strong">Public review form</div>
                <div className="muted small">Visitors fill this to leave a testimonial.</div>
              </div>
              <div className="link-copy">
                <code>{`/forms/${created.formSlug}`}</code>
                <Button variant="outline" className="btn-xs" onClick={() => void copy(formUrl, 'form')}>
                  {copied === 'form' ? (<><IconCheck size={12} /> Copied</>) : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="link-row">
              <div>
                <div className="small strong">Testimonial wall</div>
                <div className="muted small">Approved reviews shown publicly — put it where customers will see it.</div>
              </div>
              <div className="link-copy">
                <code>{`/wall/${created.app.slug}`}</code>
                <Button variant="outline" className="btn-xs" onClick={() => void copy(wallUrl, 'wall')}>
                  {copied === 'wall' ? (<><IconCheck size={12} /> Copied</>) : 'Copy'}
                </Button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button variant="ghost" onClick={reset}>
              Create another
            </Button>
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate(`/app/a/${created.app.id}/overview`);
              }}
            >
              Open product
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="modal-head">
            <div>
              <h2 style={{ margin: 0 }}>Create product</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                One product per website/surface — fully isolated reviews, form &amp; wall.
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <IconX size={13} /> Close
            </Button>
          </div>

          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.n} className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                <span className="step-dot">{step > s.n ? <IconCheck size={11} /> : s.n}</span>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}

          {step === 1 && (
            <motion.div className="stack" key="step1" {...fadeUp}>
              <div>
                <Label>Product name *</Label>
                <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Blog" />
              </div>
              <div>
                <Label>Website URL (optional)</Label>
                <TextInput
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://blog.example.com"
                />
              </div>
              {name.trim() && (
                <motion.div className="ids-box" {...fadeUp}>
                  <div>
                    <Label>Product ID</Label>
                    <code>{code}</code>
                  </div>
                  <div>
                    <Label>Public slug</Label>
                    <code>/{slug}</code>
                  </div>
                  <div>
                    <Label>Collects on</Label>
                    <code>/forms/{slug}-review</code>
                  </div>
                </motion.div>
              )}
              <div className="modal-actions">
                <Button variant="secondary" disabled={!canContinue} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div className="stack" key="step2" {...fadeUp}>
              <div>
                <Label>Accent colour</Label>
                <div className="swatches">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={`Accent ${c}`}
                      className={`swatch ${accent === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setAccent(c)}
                    />
                  ))}
                  <label className="swatch swatch-custom" title="Custom colour">
                    <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
                    +
                  </label>
                </div>
              </div>

              <div>
                <Label>Live preview — what visitors see on your wall</Label>
                <div className="wall-preview">
                  <div className="wall-preview-bar" style={{ background: accent }} />
                  <div className="wall-preview-body">
                    <div className="strong" style={{ color: accent }}>
                      {name.trim() || 'Your product'}
                    </div>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="star on">
                          <IconStar />
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

              <p className="muted small" style={{ marginBottom: 0 }}>
                Reviews are collected through a public form on that site and moderated in your queue before they appear here.
              </p>

              <div className="modal-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <IconChevronLeft size={14} /> Back
                </Button>
                <Button disabled={busy} onClick={() => void create()}>
                  {busy ? 'Creating…' : 'Create product'}
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </Modal>
  );
}
