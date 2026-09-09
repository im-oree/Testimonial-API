/** Shared animated modal (framer-motion) — premium overlay used for wizards, dialogs and forms. */
import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** How many modals are open right now (dialogs can stack, e.g. a confirm
 *  inside an edit modal). The page behind only scrolls again when the last
 *  one closes — classic mobile fix for background scroll bleed. */
let openCount = 0;

export default function Modal({
  open,
  onClose,
  children,
  width = 560,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock the page behind the dialog (restored when the last dialog closes),
  // compensating for the scrollbar width so the layout never jumps sideways.
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    if (openCount === 1) {
      const { overflow, paddingRight } = document.body.style;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
      return () => {
        document.body.style.overflow = overflow;
        document.body.style.paddingRight = paddingRight;
      };
    }
    return () => {
      openCount -= 1;
    };
  }, [open]);

  // Move focus into the dialog so keyboard + screen reader users start
  // inside it instead of on the button that opened it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeOnBackdrop ? onClose : undefined}
          role="presentation"
        >
          <motion.div
            ref={panelRef}
            className="modal modal-panel"
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
