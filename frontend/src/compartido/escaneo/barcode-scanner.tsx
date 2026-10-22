import { Modal } from '../componentes/modal';
import { useEffect, useRef, useState } from 'react';
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
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onRead, onClose });
  callbacks.current = { onRead, onClose };
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
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
    <Modal label="Escanear código de barras" closeLabel="Cerrar cámara" onClose={onClose}>
      <div className="barcode-dialog">
        <h2>Escanear código de barras</h2>
        <p>Apunta la cámara al código y mantén el producto quieto, con buena luz.</p>
        <video ref={video} muted playsInline autoPlay aria-label="Vista de la cámara" />
        {error ? <Notice>{error}</Notice> : <p role="status">Buscando un código de barras…</p>}
        <div className="form-actions">
          {error && (
            <Button type="button" onClick={() => setAttempt(attempt + 1)}>
              <Camera size={17} />
              Volver a intentar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
