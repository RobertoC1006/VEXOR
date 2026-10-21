import { useEffect, useState, type FormEvent } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { Button, Field } from '../../../compartido/componentes/ui';
import { ActionFeedback, PageHeading } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../context';
import type { BusinessDetail } from '../types';
import { BusinessLocations } from '../../locales/componentes/business-locations';

export function BusinessSettingsPage() {
  const { business, base, can, refresh } = useBusiness();
  const { updateBusiness } = useWorkspace();
  const action = useAction();
  const [name, setName] = useState(business.nombre),
    [rubro, setRubro] = useState(business.rubro ?? '');
  useEffect(() => {
    setName(business.nombre);
    setRubro(business.rubro ?? '');
  }, [business.nombre, business.rubro]);
  const editable = can('negocio.editar');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await action.run(async () => {
      const result = await api<BusinessDetail>(base, {
        method: 'PATCH',
        body: JSON.stringify({ nombre: name.trim(), rubro: rubro.trim() || null }),
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
                id="business-rubro"
                label="Rubro del negocio"
                value={rubro}
                maxLength={120}
                list="business-rubros"
                placeholder="Selecciona o escribe tu rubro"
                onChange={(event) => setRubro(event.target.value)}
              />
              <datalist id="business-rubros">
                <option value="Lencería" />
                <option value="Juguetes" />
                <option value="Abarrotes" />
                <option value="Ropa y accesorios" />
                <option value="Flores y regalos" />
              </datalist>
              <p className="field-hint">
                Puedes elegir una sugerencia o escribir otro rubro, también si vendes productos de
                varios tipos.
              </p>
            </fieldset>
            <ActionFeedback {...action} />
            {editable ? (
              <Button
                type="submit"
                busy={action.busy}
                disabled={
                  !name.trim() ||
                  (name.trim() === business.nombre &&
                    (rubro.trim() || null) === (business.rubro ?? null))
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
      <BusinessLocations />
    </>
  );
}
