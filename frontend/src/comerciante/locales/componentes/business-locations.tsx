import { Link } from 'react-router-dom';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { formatLocation } from '../location';
import type { BusinessLocal } from '../types';

export function BusinessLocations() {
  const { base, access, can } = useBusiness();
  const resource = useResource(`${base}/locales`, (signal) =>
    listAll<BusinessLocal>(`${base}/locales`, signal),
  );
  return (
    <section className="panel settings-panel">
      <h2>Ubicaciones del negocio</h2>
      <p className="muted">Cada puesto o almacén tiene su propia ubicación.</p>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : resource.data.length ? (
        <div className="assignment-list">
          {resource.data.map((local) => (
            <article className="settings-row" key={local.id}>
              <div className="settings-row-main">
                <h3>{local.nombre}</h3>
                <p>{formatLocation(local) || 'Ubicación por completar'}</p>
              </div>
              {!local.activo && <span className="badge neutral">Pausado</span>}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-inline">Todavía no tienes locales disponibles.</p>
      )}
      {(access.es_propietario || can('locales.gestionar')) && (
        <Link className="back-link" to={`${base}/locales`}>
          Configurar ubicación de los locales
        </Link>
      )}
    </section>
  );
}
