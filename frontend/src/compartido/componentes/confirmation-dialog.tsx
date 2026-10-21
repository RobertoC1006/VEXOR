import { useEffect, useId, useRef } from 'react';
import { Button } from './ui';

export function ConfirmationDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy: boolean;
  onConfirm: () => unknown;
  onCancel: () => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panel}
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={`${id}-description`}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            event.preventDefault();
            onCancel();
          }
          if (event.key === 'Tab') {
            const buttons = Array.from(
              panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (!first) {
              event.preventDefault();
              return;
            }
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id={id}>{title}</h2>
        <p id={`${id}-description`}>{description}</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" busy={busy} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
