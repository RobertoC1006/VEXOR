import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field } from '../../../compartido/componentes/ui';
import { CheckField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../types';

export function LocalForm({
  local,
  onSaved,
  onCancel,
}: {
  local?: BusinessLocal;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const { base, access } = useBusiness();
  const [name, setName] = useState(local?.nombre ?? ''),
    [sale, setSale] = useState(local?.habilitado_venta ?? false),
    [active, setActive] = useState(local?.activo ?? true),
    [confirm, setConfirm] = useState(false);
  const action = useAction();
  const changedState = Boolean(
    local && (local.activo !== active || local.habilitado_venta !== sale),
  );
  const changed = !local || name.trim() !== local.nombre || changedState;
  async function save() {
    const ok = await action.run(
      async () => {
        await api(`${base}/locales${local ? `/${local.id}` : ''}`, {
          method: local ? 'PATCH' : 'POST',
          body: JSON.stringify({
            nombre: name.trim(),
            habilitado_venta: sale,
            ...(access.es_propietario ? { activo: active } : {}),
          }),
        });
      },
      local ? 'Local actualizado.' : 'Local creado.',
    );
    if (ok) {
      setConfirm(false);
      await onSaved();
    } else setConfirm(false);
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
            Cancelar
          </Button>
          <Button type="submit" busy={action.busy} disabled={!name.trim() || !changed}>
            {local ? 'Guardar local' : 'Crear local'}
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
