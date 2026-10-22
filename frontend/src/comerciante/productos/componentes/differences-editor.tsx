import { Button, Field } from '../../../compartido/componentes/ui';
import { useId } from 'react';

export function DifferencesEditor({
  value,
  onChange,
  onRename,
  onRemove,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onRename?: (index: number, name: string) => void;
  onRemove?: (index: number) => void;
}) {
  const prefix = useId();
  return (
    <>
      <div className="combination-axes">
        {value.map((name, i) => (
          <div key={i} className="attribute-row">
            <Field
              id={`${prefix}-axis-${i}`}
              label={`Detalle ${i + 1}`}
              maxLength={40}
              value={name}
              required
              onChange={(e) =>
                onRename
                  ? onRename(i, e.target.value)
                  : onChange(value.map((n, j) => (j === i ? e.target.value : n)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Quitar detalle ${i + 1}`}
              onClick={() => (onRemove ? onRemove(i) : onChange(value.filter((_, j) => j !== i)))}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={value.length >= 20}
        onClick={() => onChange([...value, ''])}
      >
        Añadir detalle
      </Button>
    </>
  );
}
