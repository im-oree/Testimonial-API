/**
 * Interaction primitives for consistent, safe row-level UX:
 *
 * KebabMenu  — three-dot popover for a row's actions. Non-destructive actions
 *              come first; destructive actions are split into their own block
 *              at the bottom (red, with an icon) so a fast click can never
 *              land on "delete" by accident.
 *
 * ConfirmDialog — small danger modal used before any destructive change.
 *              Renders the destructive label up front ("Delete template?")
 *              and requires an explicit click on the red button.
 *
 * Row rule used across the app: a row shows at most one obvious primary
 * action; everything else (and all destructive work) lives behind the ⋮ menu,
 * and destructive work is always confirmed.
 */
import { IconCheck, IconMore, IconTrash, IconX } from './icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Modal from './Modal';
import { Button } from './ui';

export interface MenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function KebabMenu({
  actions,
  label = 'More actions',
  align = 'right',
}: {
  actions: MenuAction[];
  label?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const safe = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  return (
    <div className={`ctx ${align === 'right' ? 'ctx-right' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="ctx-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMore size={16} />
      </button>
      {open && (
        <div className="ctx-panel" role="menu" onClick={() => setOpen(false)}>
          {safe.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className="ctx-item"
              disabled={a.disabled}
              onClick={a.onSelect}
            >
              {a.icon && <span className="ctx-item-ic">{a.icon}</span>}
              <span>{a.label}</span>
            </button>
          ))}
          {danger.length > 0 && safe.length > 0 && <div className="ctx-sep" role="separator" />}
          {danger.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className="ctx-item ctx-item-danger"
              disabled={a.disabled}
              onClick={a.onSelect}
            >
              {a.icon && <span className="ctx-item-ic">{a.icon}</span>}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy = false,
  icon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} width={420}>
      <div className="confirm">
        <div className="confirm-head">
          <span className="confirm-icon">{icon ?? <IconTrash size={16} />}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
          </div>
          <Button variant="ghost" className="btn-xs" onClick={onCancel} aria-label="Close">
            <IconX size={13} />
          </Button>
        </div>
        <div className="confirm-body">{body}</div>
        <div className="modal-actions confirm-actions">
          <Button variant="ghost" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : (confirmLabel ?? 'Delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Tiny inline saved/success note used by dialogs after an action completes. */
export function OkNote({ children }: { children: ReactNode }) {
  return (
    <span className="ok-note">
      <IconCheck size={12} /> {children}
    </span>
  );
}
