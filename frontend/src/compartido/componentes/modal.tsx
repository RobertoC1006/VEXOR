import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './ui';

let locks = 0;
let previousOverflow = '';
export const ModalPendingContext = createContext<(delta: number) => void>(() => {});

/** Native dialogs keep focus and background interaction isolated, including nested dialogs. */
export function Modal({
  label,
  onClose,
  busy = false,
  children,
  closeLabel,
}: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(0);
  const trackPending = useCallback((delta: number) => setPending((n) => n + delta), []);
  const blocked = busy || pending > 0;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    if (panel.showModal) panel.showModal();
    else panel.setAttribute('open', '');
    return () => {
      panel.close?.();
      if (--locks === 0) document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="workspace-dialog"
      aria-label={label}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        if (!blocked) onClose();
      }}
    >
      <div className="dialog-navigation">
        <h2 title={label}>{label}</h2>
        <Button
          type="button"
          variant="ghost"
          disabled={blocked}
          onClick={onClose}
          aria-label={closeLabel ?? `Cerrar ${label}`}
        >
          <X size={18} /> Cerrar
        </Button>
      </div>
      <div className="dialog-content">
        <ModalPendingContext.Provider value={trackPending}>{children}</ModalPendingContext.Provider>
      </div>
    </dialog>,
    document.body,
  );
}
