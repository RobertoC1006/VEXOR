import { Field } from '../componentes/ui';
import { ScanCodeButton } from './scan-code-button';

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
        <ScanCodeButton disabled={disabled} onRead={onChange} />
      </div>
      <p className="field-hint">
        Escanear copia el código. El nombre y los demás datos los completas en esta ficha.
      </p>
    </>
  );
}
