import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '../componentes/ui';
import { BarcodeScanner } from './barcode-scanner';

export function ScanCodeButton({
  onRead,
  label = 'Escanear con cámara',
  disabled = false,
}: {
  onRead: (code: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        <Camera size={18} />
        {label}
      </Button>
      {open && (
        <BarcodeScanner
          onClose={() => setOpen(false)}
          onRead={(code) => {
            setOpen(false);
            onRead(code);
          }}
        />
      )}
    </>
  );
}
