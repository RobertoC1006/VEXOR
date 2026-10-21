import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Button, Field } from '../componentes/ui';
import { BarcodeScanner } from './barcode-scanner';

export function CodeField({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="code-field">
        <Field
          id={id}
          label="Código (opcional)"
          maxLength={120}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
          <Camera size={18} />
          Escanear con cámara
        </Button>
      </div>
      <p className="field-hint">
        Escanear copia el código. El nombre y los demás datos los completas en esta ficha.
      </p>
      {open && (
        <BarcodeScanner
          onClose={() => setOpen(false)}
          onRead={(code) => {
            onChange(code);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
