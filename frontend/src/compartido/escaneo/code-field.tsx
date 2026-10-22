import { Field } from '../componentes/ui';
import { ScanCodeButton } from './scan-code-button';

export function CodeField({
  id,
  value,
  onChange,
  disabled = false,
  label = 'Código (opcional)',
  hint = 'Escanear copia el código. El nombre y los demás datos los completas en esta ficha.',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string | null;
}) {
  return (
    <>
      <div className="code-field">
        <Field
          id={id}
          label={label}
          maxLength={120}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <ScanCodeButton disabled={disabled} onRead={onChange} />
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </>
  );
}
