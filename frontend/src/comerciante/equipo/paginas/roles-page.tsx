import { Modal } from '../../../compartido/componentes/modal';
import { useClientPage, ClientPager } from '../../../compartido/componentes/pagination';
import { useState, type FormEvent } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { api, listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Empty, Field } from '../../../compartido/componentes/ui';
import {
  ActionFeedback,
  PageHeading,
  ResourceState,
} from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { RoleEditor } from '../componentes/role-editor';
import type { Permission, Role } from '../types';

export function RolesPage() {
  const { base, access } = useBusiness();
  const resource = useResource(`${base}/roles`, async (signal) => {
    const [roles, permissions] = await Promise.all([
      listAll<Role>(`${base}/roles`, signal),
      api<Permission[]>(`${base}/permisos`, { signal }),
    ]);
    return { roles, permissions };
  });
  const [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [name, setName] = useState('');
  const action = useAction();
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!access.es_propietario) return;
    await action.run(async () => {
      const role = await api<Role>(`${base}/roles`, {
        method: 'POST',
        body: JSON.stringify({ nombre: name.trim() }),
      });
      setSelected(role.id);
      setCreating(false);
      setName('');
      await resource.refresh();
    }, 'Rol creado. Ahora puedes elegir sus permisos.');
  }
  const page = useClientPage(resource.data?.roles ?? []);
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  const { roles, permissions } = resource.data;
  const role = roles.find((role) => role.id === selected);
  return (
    <>
      <PageHeading
        title="Roles y permisos"
        description="Agrupa las tareas como le resulte útil a tu negocio."
        action={
          access.es_propietario && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={17} />
              Crear rol
            </Button>
          )
        }
      />
      <ActionFeedback {...action} />
      <p className="field-hint">
        El listado es el mismo para todos los roles; lo que cambia es qué acciones marcas. Incluye
        las acciones disponibles de configuración, locales, equipo, productos, inventario y ventas.
        Los permisos de otros módulos se incorporarán cuando estén disponibles.
      </p>
      {creating && (
        <Modal label="Nuevo rol" onClose={() => setCreating(false)}>
          <section className="panel settings-panel">
            <h2>Nuevo rol</h2>
            <form className="settings-form" onSubmit={create}>
              <Field
                id="new-role-name"
                label="Nombre del rol"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                autoFocus
              />
              <p className="field-hint">
                Después de crearlo puedes elegir una base sugerida, como Solo consulta, y ajustar
                sus acciones.
              </p>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setCreating(false)}
                >
                  Cancelar
                </Button>
                <Button busy={action.busy} disabled={!name.trim()}>
                  Crear rol
                </Button>
              </div>
            </form>
          </section>
        </Modal>
      )}
      <div className="settings-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Roles del negocio</h2>
            <span className="count">{roles.length}</span>
          </div>
          <ClientPager page={page} />
          {roles.length ? (
            <div className="settings-list">
              {page.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`role-choice ${item.id === selected ? 'selected' : ''}`}
                  aria-pressed={item.id === selected}
                  onClick={() => setSelected(item.id)}
                >
                  <ShieldCheck size={20} />
                  <span>
                    <strong>{item.nombre}</strong>
                    <small>{item.activo ? 'Activo' : 'Inactivo'}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty title="Define cómo trabaja tu equipo">
              Crea un rol con el nombre y las acciones que necesites. No hay roles comerciales
              obligatorios.
            </Empty>
          )}
        </section>
        {role ? (
          <Modal label={`Permisos de ${role.nombre}`} onClose={() => setSelected(null)}>
            <RoleEditor
              key={role.id}
              role={role}
              permissions={permissions}
              onSaved={resource.refresh}
            />
          </Modal>
        ) : (
          <aside className="settings-aside">
            <ShieldCheck size={26} />
            <h2>Accesos a tu medida</h2>
            <p>
              Selecciona un rol para consultar sus acciones. El propietario conserva las capacidades
              de administración del negocio.
            </p>
          </aside>
        )}
      </div>
    </>
  );
}
