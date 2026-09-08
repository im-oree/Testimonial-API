/** Platform console — create tenant setup wizard (modal). */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { CreateSubCompanyResponse } from '../../lib/types';
import { Button, Label, Select, TextInput } from '../../components/ui';
import Modal from '../../components/Modal';

const STEPS = [
  { n: 1, label: 'Company' },
  { n: 2, label: 'Owner admin' },
];

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

function slugFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || ''
  );
}

export default function CreateTenantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState('starter');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateSubCompanyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  function resetAll(): void {
    setStep(1);
    setName('');
    setSlug('');
    setPlan('starter');
    setOwnerName('');
    setOwnerEmail('');
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  useEffect(() => {
    if (!open) resetAll();
  }, [open]);

  function onNameChange(value: string): void {
    setName(value);
    setSlug((prev) => (prev === slugFromName(name) || !prev ? slugFromName(value) : prev));
  }

  const step1Ok = name.trim().length > 0;
  const step2Ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim());

  async function create(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<CreateSubCompanyResponse>('/v1/platform/tenants', {
        name: name.trim(),
        slug: slug || undefined,
        plan,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
      });
      setCreated(res);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the tenant.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCreds(): Promise<void> {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${created.credentials.email} / ${created.credentials.password}`);
    } catch {
      // no-op — visual feedback only
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Modal open={open} onClose={onClose} width={620}>
      {created ? (
        <motion.div className="stack" key="done" {...fadeUp}>
          <div className="success-row">
            <span className="success-check">✓</span>
            <div>
              <h2 style={{ margin: 0 }}>{created.tenant.name} is live</h2>
              <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                {created.message} Workspace appears across the platform immediately.
              </p>
            </div>
          </div>

          <div className="credential-box">
            <div>
              <Label>Sign-in email</Label>
              <code>{created.credentials.email}</code>
            </div>
            <div>
              <Label>Initial password (shown once)</Label>
              <code>{created.credentials.password}</code>
            </div>
          </div>

          <div className="ready-summary">
            <div className="ready-chip ready-chip-navy">/{created.tenant.slug}</div>
            <div>
              <div className="strong">{created.tenant.name}</div>
              <div className="muted small">
                {created.tenant.plan} plan · ${created.tenant.monthlyCostUsd}/mo · owner {created.credentials.email}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button variant="ghost" onClick={copyCreds}>
              {copied ? 'Copied ✓' : 'Copy credentials'}
            </Button>
            <Button variant="outline" onClick={resetAll}>
              Create another
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate(`/platform/tenants/${created.tenant.id}`);
              }}
            >
              Open tenant →
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="modal-head">
            <div>
              <h2 style={{ margin: 0 }}>Create tenant</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Provision the tenant, its ID and the admin account — all synced end-to-end.
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ✕ Close
            </Button>
          </div>

          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.n} className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                <span className="step-dot">{step > s.n ? '✓' : s.n}</span>
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
            <motion.div className="stack" key="c1" {...fadeUp}>
              <div>
                <Label>Company name *</Label>
                <TextInput autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Northstar Labs" />
              </div>
              <div>
                <Label>Company ID (slug)</Label>
                <TextInput value={slug} onChange={(e) => setSlug(slugFromName(e.target.value))} placeholder="auto-generated from name" />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="starter">Starter — $29/mo</option>
                  <option value="growth">Growth — $99/mo</option>
                  <option value="scale">Scale — $299/mo</option>
                </Select>
              </div>
              <div className="modal-actions">
                <Button variant="secondary" disabled={!step1Ok} onClick={() => setStep(2)}>
                  Continue →
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div className="stack" key="c2" {...fadeUp}>
              <div className="ids-box" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <Label>Company ID</Label>
                  <code>/{slug || '…'}</code>
                </div>
                <div>
                  <Label>Plan</Label>
                  <code>{(plan[0] || '').toUpperCase() + plan.slice(1)} · ${plan === 'starter' ? '29' : plan === 'growth' ? '99' : '299'}/mo</code>
                </div>
              </div>
              <div>
                <Label>Admin name *</Label>
                <TextInput autoFocus value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Nora North" />
              </div>
              <div>
                <Label>Admin email *</Label>
                <TextInput
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@northstar.test"
                />
              </div>
              <p className="muted small" style={{ marginBottom: 0 }}>
                The admin account is created automatically with the standard demo password (<code>demo1234</code>) and shown once here.
              </p>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ‹ Back
                </Button>
                <Button disabled={busy || !step2Ok || !ownerName.trim()} onClick={() => void create()}>
                  {busy ? 'Creating…' : 'Create tenant'}
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </Modal>
  );
}
