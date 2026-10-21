import { useState } from 'react';
import { MapPin, Plus, RefreshCw, Store, Warehouse } from 'lucide-react';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Empty } from '../../../compartido/componentes/ui';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { LocalForm } from '../componentes/local-form';
import type { BusinessLocal } from '../types';

export function LocalsPage() {
  const { base, access, can, refresh } = useBusiness();
  const resource = useResource(`${base}/locales`, (signal) =>
    listAll<BusinessLocal>(`${base}/locales`, signal),
  );
  const [editor, setEditor] = useState<BusinessLocal | 'new' | null>(null);
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  const locals = resource.data;
  async function saved() {
    setEditor(null);
    await Promise.all([resource.refresh(), refresh()]);
  }
  return (
    <>
      <PageHeading
        title="Puestos y almacenes"
        description="Organiza los espacios donde vendes y guardas tu mercadería."
        action={
          access.es_propietario && (
            <Button onClick={() => setEditor('new')}>
              <Plus size={17} />
              Nuevo local
            </Button>
          )
        }
      />
      {editor && (
        <LocalForm
          key={editor === 'new' ? 'new' : editor.id}
          local={editor === 'new' ? undefined : editor}
          onCancel={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Locales del negocio <span className="count">{locals.length}</span>
          </h2>
          <Button
            variant="ghost"
            onClick={() => void resource.refresh()}
            disabled={resource.loading}
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
        {locals.length ? (
          <div className="settings-list">
            {locals.map((local) => (
              <article key={local.id} className="settings-row">
                <span className="icon-tile">
                  {local.habilitado_venta ? <Store size={23} /> : <Warehouse size={23} />}
                </span>
                <div className="settings-row-main">
                  <h3>{local.nombre}</h3>
                  <p>{local.habilitado_venta ? 'Puesto de venta y almacenamiento' : 'Almacén'}</p>
                </div>
                <span className={`badge ${local.activo ? 'success' : 'neutral'}`}>
                  {local.activo ? 'Activo' : 'Pausado'}
                </span>
                {can('locales.gestionar') && (
                  <Button variant="secondary" onClick={() => setEditor(local)}>
                    Editar<span className="visually-hidden"> {local.nombre}</span>
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={
              access.es_propietario
                ? 'Agrega tu primer local'
                : 'Todavía no tienes locales disponibles'
            }
          >
            {access.es_propietario
              ? 'Puedes empezar por tu puesto de venta o por el espacio donde guardas la mercadería.'
              : 'El propietario debe asignarte un local y los permisos para consultarlo.'}
          </Empty>
        )}
      </section>
      <p className="quiet-note">
        <MapPin size={17} />
        Los estantes y vitrinas se organizarán dentro de cada local al incorporar el inventario.
      </p>
    </>
  );
}
