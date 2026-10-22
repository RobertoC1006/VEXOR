import { useState } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { Button, Field } from '../../../compartido/componentes/ui';
import { useBusiness } from '../../negocio/context';
export function MinimumForm({
  id,
  localId,
  minimum,
  version,
  onSaved,
}: {
  id: string;
  localId: string;
  minimum: number | null;
  version: number;
  onSaved: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const action = useAction();
  const [value, setValue] = useState(minimum === null ? '' : String(minimum));
  return (
    <form
      className="minimum-form"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api(`${base}/locales/${localId}/inventario/${id}/minimo`, {
            method: 'PUT',
            body: JSON.stringify({ minimo: value === '' ? null : Number(value), version }),
          });
          await onSaved();
        }, 'Mínimo guardado.');
      }}
    >
      <h3>Mínimo en este local</h3>
      <p className="field-hint">
        Cuando el stock confirmado llegue al mínimo o quede por debajo, verás el indicador rojo y
        «Stock bajo». Déjalo vacío para quitar el mínimo.
      </p>
      <Field
        id="stock-minimum"
        label="Stock mínimo"
        type="number"
        min={1}
        max={2147483647}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={action.busy}
      />
      <ActionFeedback {...action} />
      <Button busy={action.busy} disabled={value === (minimum === null ? '' : String(minimum))}>
        Guardar mínimo
      </Button>
    </form>
  );
}
