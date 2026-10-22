import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from './modal';
import { ChoiceCards } from './choice-cards';
export function ChoicePicker({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { id: string; title: string; description: string; label?: string }[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.id === value);
  return (
    <div className="field">
      <span>{label}</span>
      <button
        type="button"
        className="category-picker"
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span>
          {chosen?.label ?? chosen?.title ?? 'Elegir'}
          <small>Ver opciones</small>
        </span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <Modal label={label} onClose={() => setOpen(false)}>
          <ChoiceCards
            searchLabel="Buscar opción"
            options={options}
            selected={value}
            onChoose={(id) => {
              onChange(id);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
