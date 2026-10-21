import { useId, type SelectHTMLAttributes } from 'react';

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select {...props} id={id}>
        {children}
      </select>
    </label>
  );
}
export function CheckField({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="check-field">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
export function ChoiceList({
  legend,
  items,
  value,
  onChange,
  disabled = false,
}: {
  legend: string;
  items: { id: string; label: string; detail?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="choice-list" disabled={disabled}>
      <legend>{legend}</legend>
      {items.length ? (
        items.map((item) => (
          <CheckField
            key={item.id}
            label={item.label}
            hint={item.detail}
            checked={value.includes(item.id)}
            onChange={(checked) =>
              onChange(checked ? [...value, item.id] : value.filter((id) => id !== item.id))
            }
          />
        ))
      ) : (
        <p className="muted">No hay opciones disponibles.</p>
      )}
    </fieldset>
  );
}
