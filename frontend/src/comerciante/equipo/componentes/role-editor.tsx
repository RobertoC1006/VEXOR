import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field } from '../../../compartido/componentes/ui';
import { ChoiceList } from '../../../compartido/componentes/form-controls';
import { ActionFeedback, ResourceState } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { Permission, Role } from '../types';
import { permissionLabel } from '../permissions';
import { PermissionSuggestions } from './permission-suggestions';

export function RoleEditor({
  role,
  permissions,
  onSaved,
}: {
  role: Role;
  permissions: Permission[];
  onSaved: () => Promise<unknown>;
}) {
  const { base, access } = useBusiness();
  const path = `${base}/roles/${role.id}`;
  const resource = useResource(path, (signal) =>
    api<{ permiso_codigo: string }[]>(`${path}/permisos`, { signal }),
  );
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  return (
    <RoleForm
      key={`${role.id}:${role.actualizado_en ?? ''}`}
      role={role}
      permissions={permissions}
      selected={resource.data.map((item) => item.permiso_codigo)}
      editable={access.es_propietario}
      onSaved={async () => {
        await Promise.all([onSaved(), resource.refresh()]);
      }}
    />
  );
}
function RoleForm({
  role,
  permissions,
  selected,
  editable,
  onSaved,
}: {
  role: Role;
  permissions: Permission[];
  selected: string[];
  editable: boolean;
  onSaved: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const path = `${base}/roles/${role.id}`;
  const [name, setName] = useState(role.nombre),
    [values, setValues] = useState(selected),
    [confirm, setConfirm] = useState(false);
  const action = useAction();
  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await action.run(async () => {
      await api(path, { method: 'PATCH', body: JSON.stringify({ nombre: name.trim() }) });
      await onSaved();
    });
  }
  async function savePermissions(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await action.run(async () => {
      await api(`${path}/permisos`, { method: 'PUT', body: JSON.stringify({ permisos: values }) });
      await onSaved();
    }, 'Permisos del rol guardados.');
  }
  async function changeState() {
    const ok = await action.run(
      async () => {
        await api(path, { method: 'PATCH', body: JSON.stringify({ activo: !role.activo }) });
        await onSaved();
      },
      role.activo ? 'Rol desactivado.' : 'Rol activado.',
    );
    if (ok) setConfirm(false);
  }
  return (
    <section className="panel settings-panel">
      <div className="panel-heading compact">
        <h2>{role.nombre}</h2>
        <span className={`badge ${role.activo ? 'success' : 'neutral'}`}>
          {role.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <ActionFeedback {...action} />
      <form className="settings-form" onSubmit={saveName}>
        <Field
          id="role-name-edit"
          label="Nombre del rol"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!editable || action.busy}
        />
        {editable && (
          <Button busy={action.busy} disabled={!name.trim() || name.trim() === role.nombre}>
            Guardar nombre
          </Button>
        )}
      </form>
      <form className="settings-form settings-divider" onSubmit={savePermissions}>
        {editable && (
          <PermissionSuggestions
            permissions={permissions}
            disabled={action.busy}
            onSelect={setValues}
          />
        )}
        <ChoiceList
          legend="Acciones que permite este rol"
          value={values}
          onChange={setValues}
          disabled={!editable || action.busy}
          items={permissions.map((permission) => ({
            id: permission.codigo,
            label: permissionLabel(permission),
            detail:
              permission.alcance === 'local'
                ? 'Se aplica en los locales asignados.'
                : 'Se aplica al negocio.',
          }))}
        />
        <p className="field-hint">
          Los roles con alcance de un local no conceden acciones generales del negocio. Una
          denegación individual vigente tiene prioridad.
        </p>
        {editable && (
          <Button
            busy={action.busy}
            disabled={
              values.length === selected.length && values.every((value) => selected.includes(value))
            }
          >
            Guardar permisos
          </Button>
        )}
      </form>
      {editable && (
        <div className="settings-divider">
          <Button variant="secondary" disabled={action.busy} onClick={() => setConfirm(true)}>
            {role.activo ? 'Desactivar rol' : 'Activar rol'}
          </Button>
          <p className="field-hint">
            Desactivar conserva el rol y sus asignaciones, pero sus permisos dejan de aplicarse.
          </p>
        </div>
      )}
      {confirm && (
        <ConfirmationDialog
          title={role.activo ? 'Desactivar rol' : 'Activar rol'}
          description={
            role.activo
              ? `Los permisos de ${role.nombre} dejarán de aplicarse a las personas que lo tienen asignado.`
              : `Los permisos de ${role.nombre} volverán a aplicarse a sus asignaciones.`
          }
          busy={action.busy}
          onConfirm={changeState}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}
