import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button } from '../../../compartido/componentes/ui';
import { CheckField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { Member } from '../types';

export function MemberAccess({
  member,
  onSaved,
}: {
  member: Member;
  onSaved: () => Promise<unknown>;
}) {
  const { base, access } = useBusiness();
  const [active, setActive] = useState(member.activo),
    [owner, setOwner] = useState(member.es_propietario),
    [confirm, setConfirm] = useState(false);
  const action = useAction();
  function prepare(event: FormEvent) {
    event.preventDefault();
    setConfirm(true);
  }
  async function save() {
    const ok = await action.run(async () => {
      await api(`${base}/miembros/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: active, es_propietario: owner }),
      });
      setConfirm(false);
      await onSaved();
    }, 'Acceso actualizado.');
    if (!ok) setConfirm(false);
  }
  return (
    <section className="panel settings-panel">
      <h2>Acceso al negocio</h2>
      <form className="settings-form" onSubmit={prepare}>
        <fieldset disabled={!access.es_propietario || action.busy}>
          <CheckField
            label="Acceso activo"
            checked={active}
            onChange={setActive}
            hint="Al desactivarlo, la persona deja de operar en este negocio."
          />
          <CheckField
            label="Propietario del negocio"
            checked={owner}
            onChange={setOwner}
            hint="Concede administración del negocio y acceso a todos sus locales."
          />
        </fieldset>
        <ActionFeedback {...action} />
        {access.es_propietario && (
          <Button
            disabled={active === member.activo && owner === member.es_propietario}
            busy={action.busy}
          >
            Guardar acceso
          </Button>
        )}
      </form>
      {confirm && (
        <ConfirmationDialog
          title="Actualizar acceso"
          description={`${member.nombre} quedará ${active ? 'con acceso activo' : 'sin acceso'} ${owner ? 'como propietario' : 'como miembro del equipo'}. El negocio debe conservar al menos un propietario activo.`}
          busy={action.busy}
          onCancel={() => setConfirm(false)}
          onConfirm={save}
        />
      )}
    </section>
  );
}
