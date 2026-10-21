import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button } from '../../../compartido/componentes/ui';
import { ChoiceList, SelectField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../../locales/types';
import type { Member, MemberRole, Role } from '../types';

export function MemberLocals({
  member,
  locals,
  assigned,
  onSaved,
}: {
  member: Member;
  locals: BusinessLocal[];
  assigned: string[];
  onSaved: () => Promise<unknown>;
}) {
  const { base, access } = useBusiness();
  const [values, setValues] = useState(assigned);
  const action = useAction();
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!access.es_propietario) return;
    await action.run(async () => {
      await api(`${base}/miembros/${member.id}/locales`, {
        method: 'PUT',
        body: JSON.stringify({ locales_ids: values }),
      });
      await onSaved();
    }, 'Locales asignados.');
  }
  return (
    <section className="panel settings-panel">
      <h2>Locales asignados</h2>
      {member.es_propietario ? (
        <p className="muted">Como propietario, tiene acceso a todos los locales del negocio.</p>
      ) : (
        <form className="settings-form" onSubmit={save}>
          <ChoiceList
            legend="Dónde puede trabajar"
            items={locals.map((local) => ({
              id: local.id,
              label: local.nombre,
              detail: local.activo
                ? local.habilitado_venta
                  ? 'Puesto de venta'
                  : 'Almacén'
                : 'Local pausado',
            }))}
            value={values}
            onChange={setValues}
            disabled={!access.es_propietario || action.busy}
          />
          <ActionFeedback {...action} />
          {access.es_propietario && (
            <Button
              busy={action.busy}
              disabled={
                assigned.length === values.length &&
                values.every((value) => assigned.includes(value))
              }
            >
              Guardar locales
            </Button>
          )}
        </form>
      )}
    </section>
  );
}
export function MemberRoles({
  member,
  roles,
  locals,
  assignments,
  assignedLocals,
  onSaved,
}: {
  member: Member;
  roles: Role[];
  locals: BusinessLocal[];
  assignments: MemberRole[];
  assignedLocals: string[];
  onSaved: () => Promise<unknown>;
}) {
  const { base, access } = useBusiness();
  const [role, setRole] = useState(''),
    [local, setLocal] = useState(''),
    [remove, setRemove] = useState<MemberRole | null>(null);
  const action = useAction();
  const path = `${base}/miembros/${member.id}/roles`;
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!access.es_propietario) return;
    await action.run(async () => {
      await api(path, {
        method: 'POST',
        body: JSON.stringify({ rol_id: role, local_id: local || null }),
      });
      setRole('');
      setLocal('');
      await onSaved();
    }, 'Rol asignado.');
  }
  async function discard() {
    if (!remove) return;
    const ok = await action.run(async () => {
      await api(`${path}/${remove.id}`, { method: 'DELETE' });
      await onSaved();
    }, 'Asignación de rol retirada.');
    if (ok) setRemove(null);
  }
  return (
    <section className="panel settings-panel">
      <h2>Roles asignados</h2>
      <ActionFeedback {...action} />
      <div className="assignment-list">
        {assignments.length ? (
          assignments.map((assignment) => (
            <div className="assignment-row" key={assignment.id}>
              <div>
                <strong>
                  {roles.find((role) => role.id === assignment.rol_id)?.nombre ??
                    'Rol no disponible'}
                </strong>
                <p>
                  {assignment.local_id
                    ? (locals.find((local) => local.id === assignment.local_id)?.nombre ??
                      'Local sin acceso')
                    : 'Alcance de negocio'}
                </p>
              </div>
              {access.es_propietario && (
                <Button
                  variant="ghost"
                  disabled={action.busy}
                  onClick={() => setRemove(assignment)}
                >
                  Quitar rol
                </Button>
              )}
            </div>
          ))
        ) : (
          <p className="muted">No tiene roles asignados.</p>
        )}
      </div>
      {access.es_propietario && (
        <form className="settings-form settings-divider" onSubmit={add}>
          <SelectField
            label="Rol para asignar"
            value={role}
            required
            onChange={(event) => setRole(event.target.value)}
            disabled={action.busy}
          >
            <option value="">Selecciona un rol</option>
            {roles
              .filter((role) => role.activo)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nombre}
                </option>
              ))}
          </SelectField>
          <SelectField
            label="Alcance del rol"
            value={local}
            onChange={(event) => setLocal(event.target.value)}
            disabled={action.busy}
          >
            <option value="">Negocio y sus locales autorizados</option>
            {locals
              .filter(
                (local) =>
                  local.activo && (member.es_propietario || assignedLocals.includes(local.id)),
              )
              .map((local) => (
                <option value={local.id} key={local.id}>
                  {local.nombre}
                </option>
              ))}
          </SelectField>
          <p className="field-hint">
            Asignar un rol no sustituye la asignación de locales. Si limitas el rol a un local, sus
            acciones generales de negocio no se aplican.
          </p>
          <Button busy={action.busy} disabled={!role}>
            Asignar rol
          </Button>
        </form>
      )}
      {remove && (
        <ConfirmationDialog
          title="Quitar asignación de rol"
          description={`Se retirará esta asignación de ${member.nombre}. Sus demás roles y permisos individuales se conservan.`}
          busy={action.busy}
          confirmLabel="Quitar rol"
          onConfirm={discard}
          onCancel={() => setRemove(null)}
        />
      )}
    </section>
  );
}
