import { useEffect, useId, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button, Notice } from '../componentes/ui';
import { scanCamera, cameraError } from './camera';

export function BarcodeScanner({
  onRead,
  onClose,
}: {
  onRead: (code: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const video = useRef<HTMLVideoElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onRead, onClose });
  callbacks.current = { onRead, onClose };
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
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
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    const cancelOnHidden = () => {
      if (document.hidden) {
        controller.abort();
        callbacks.current.onClose();
      }
    };
    document.addEventListener('visibilitychange', cancelOnHidden);
    void scanCamera(video.current!, controller.signal, (code) => {
      if (code.length > 120 || !code.trim() || /[\x00-\x1f]/.test(code)) {
        setError(
          'El código leído no es válido para este campo. Intenta con el código de barras del producto.',
        );
        return;
      }
      callbacks.current.onRead(code.trim());
    }).catch((e) => {
      if (!controller.signal.aborted) setError(cameraError(e));
    });
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', cancelOnHidden);
    };
  }, [attempt]);
  return (
    <div className="dialog-backdrop">
      <div
        ref={panel}
        className="confirmation-dialog barcode-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const buttons = Array.from(
              panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 id={id}>Escanear código de barras</h2>
        <p>Apunta la cámara al código y mantén el producto quieto, con buena luz.</p>
        <video ref={video} muted playsInline autoPlay aria-label="Vista de la cámara" />
        {error ? <Notice>{error}</Notice> : <p role="status">Buscando un código de barras…</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar cámara
          </Button>
          {error && (
            <Button type="button" onClick={() => setAttempt(attempt + 1)}>
              <Camera size={17} />
              Volver a intentar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
