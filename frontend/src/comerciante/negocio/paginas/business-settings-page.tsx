import { useEffect, useState, type FormEvent } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { Button, Field } from '../../../compartido/componentes/ui';
import { ActionFeedback, PageHeading } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../context';
import type { BusinessDetail } from '../types';

export function BusinessSettingsPage() {
  const { business, base, can, refresh } = useBusiness();
  const { updateBusiness } = useWorkspace();
  const action = useAction();
  const [name, setName] = useState(business.nombre),
    [zone, setZone] = useState(business.zona_horaria);
  useEffect(() => {
    setName(business.nombre);
    setZone(business.zona_horaria);
  }, [business.nombre, business.zona_horaria]);
  const editable = can('negocio.editar');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await action.run(async () => {
      const result = await api<BusinessDetail>(base, {
        method: 'PATCH',
        body: JSON.stringify({ nombre: name.trim(), zona_horaria: zone.trim() }),
      });
      updateBusiness(result.id, result.nombre);
      await refresh();
    });
  }
  return (
    <>
      <PageHeading
        title="Mi negocio"
        description="Los datos con los que tu equipo reconoce el negocio."
      />
      <div className="settings-columns">
        <section className="panel settings-panel">
          <h2>Información del negocio</h2>
          <p className="muted">Usa el nombre que reconocen las personas que trabajan contigo.</p>
          <form className="settings-form" onSubmit={save}>
            <fieldset disabled={!editable || action.busy}>
              <Field
                id="business-name"
                label="Nombre del negocio"
                value={name}
                maxLength={160}
                required
                onChange={(event) => setName(event.target.value)}
              />
              <Field
                id="business-zone"
                label="Zona horaria"
                value={zone}
                required
                maxLength={80}
                list="business-zones"
                onChange={(event) => setZone(event.target.value)}
              />
              <datalist id="business-zones">
                <option value="America/Lima" />
                <option value="America/Bogota" />
                <option value="America/La_Paz" />
              </datalist>
              <p className="field-hint">
                Por ejemplo, America/Lima. Se utiliza para mostrar fechas y horas del negocio.
              </p>
            </fieldset>
            <ActionFeedback {...action} />
            {editable ? (
              <Button
                type="submit"
                busy={action.busy}
                disabled={
                  !name.trim() ||
                  !zone.trim() ||
                  (name === business.nombre && zone === business.zona_horaria)
                }
              >
                <Save size={17} />
                Guardar cambios
              </Button>
            ) : (
              <p className="field-hint">
                Puedes consultar estos datos. Para editarlos necesitas autorización del propietario.
              </p>
            )}
          </form>
        </section>
        <aside className="settings-aside">
          <ShieldCheck size={25} />
          <h2>Un espacio propio</h2>
          <p>
            Estos datos pertenecen a {business.nombre}. Los permisos y locales se configuran dentro
            de este negocio.
          </p>
          <span className="badge success">
            {business.activo ? 'Servicio activo' : 'Servicio inactivo'}
          </span>
        </aside>
      </div>
    </>
  );
}
