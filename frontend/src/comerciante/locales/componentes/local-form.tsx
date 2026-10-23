import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field } from '../../../compartido/componentes/ui';
import { CheckField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../types';
import { locationFields, locationValues } from '../location';

export function LocalForm({
  local,
  onSaved,
  onCancel,
  defaultSale = false,
  submitLabel,
  cancelLabel = 'Cancelar',
}: {
  local?: BusinessLocal;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
  defaultSale?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}) {
  const { base, access } = useBusiness();
  const [name, setName] = useState(local?.nombre ?? ''),
    [sale, setSale] = useState(local?.habilitado_venta ?? defaultSale),
    [active, setActive] = useState(local?.activo ?? true),
    [confirm, setConfirm] = useState(false);
  const action = useAction();
  const [location, setLocation] = useState(() => locationValues(local));
  const changedState = Boolean(
    local && (local.activo !== active || local.habilitado_venta !== sale),
  );
  const changed =
    !local ||
    name.trim() !== local.nombre ||
    changedState ||
    JSON.stringify(locationValues(local)) !== JSON.stringify(locationValues(location));
  async function save() {
    await action.run(
      async () => {
        await api(`${base}/locales${local ? `/${local.id}` : ''}`, {
          method: local ? 'PATCH' : 'POST',
          body: JSON.stringify({
            nombre: name.trim(),
            habilitado_venta: sale,
            ...locationValues(location),
            ...(access.es_propietario ? { activo: active } : {}),
          }),
        });
        setConfirm(false);
        await onSaved();
      },
      local ? 'Local actualizado.' : 'Local creado.',
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (changedState) setConfirm(true);
    else void save();
  }
  return (
    <section className="panel settings-panel" aria-label={local ? 'Editar local' : 'Nuevo local'}>
      <h2>{local ? 'Editar local' : 'Nuevo puesto o almacén'}</h2>
      <form className="settings-form" onSubmit={submit}>
        <fieldset disabled={action.busy}>
          <Field
            id="local-name"
            label="Nombre del local"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <h3>Ubicación del local</h3>
          <p className="field-hint">
            Completa los datos que correspondan. También puedes ubicar un almacén fuera del mercado
            usando la referencia.
          </p>
          <div className="form-grid">
            {locationFields.map(({ key, ...field }) => (
              <Field
                key={key}
                id={`local-${key}`}
                {...field}
                value={location[key] ?? ''}
                onChange={(event) =>
                  setLocation((previous) => ({ ...previous, [key]: event.target.value }))
                }
              />
            ))}
          </div>
          <CheckField
            label="Habilitado para vender"
            checked={sale}
            onChange={setSale}
            hint="Un puesto de venta también puede guardar mercadería. Si no vende, funciona como almacén."
          />
          {local && access.es_propietario && (
            <CheckField
              label="Local activo"
              checked={active}
              onChange={setActive}
              hint="Al pausarlo, el equipo deja de acceder al local. Sus registros se conservan."
            />
          )}
          <p className="field-hint">El plan básico permite un solo puesto activo para venta.</p>
        </fieldset>
        <ActionFeedback {...action} />
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={action.busy}>
            {cancelLabel}
          </Button>
          <Button type="submit" busy={action.busy} disabled={!name.trim() || !changed}>
            {submitLabel ?? (local ? 'Guardar local' : 'Crear local')}
          </Button>
        </div>
      </form>
      {confirm && (
        <ConfirmationDialog
          title="Confirmar cambios del local"
          description={`${name.trim()} quedará ${active ? 'activo' : 'pausado'} y ${sale ? 'habilitado para vender' : 'destinado a almacenamiento, sin venta'}. Los registros existentes se conservan.`}
          confirmLabel="Guardar local"
          busy={action.busy}
          onCancel={() => setConfirm(false)}
          onConfirm={save}
        />
      )}
    </section>
  );
}
