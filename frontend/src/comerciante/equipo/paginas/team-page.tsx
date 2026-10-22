import { useClientPage, ClientPager } from '../../../compartido/componentes/pagination';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw, UserRound } from 'lucide-react';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button } from '../../../compartido/componentes/ui';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { Member } from '../types';

export function TeamPage() {
  const { base, access } = useBusiness();
  const resource = useResource(`${base}/miembros`, (signal) =>
    listAll<Member>(`${base}/miembros`, signal),
  );
  const page = useClientPage(resource.data ?? []);
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  return (
    <>
      <PageHeading
        title="Tu equipo"
        description="Cada persona trabaja con su propia cuenta y los accesos que le corresponden."
        action={
          access.es_propietario && (
            <Link className="button primary" to={`${base}/equipo/invitaciones`}>
              <Mail size={17} />
              Invitar persona
            </Link>
          )
        }
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Personas del negocio <span className="count">{resource.data.length}</span>
          </h2>
          <Button variant="ghost" onClick={() => void resource.refresh()}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
        <ClientPager page={page} />
        <div className="settings-list">
          {page.items.map((member) => (
            <article className="settings-row" key={member.id}>
              <span className="icon-tile">
                <UserRound size={23} />
              </span>
              <div className="settings-row-main">
                <h3>{member.nombre}</h3>
                <p>
                  {member.es_propietario ? 'Propietario' : 'Miembro del equipo'}
                  {member.id === access.miembro_id ? ' · Tú' : ''}
                </p>
              </div>
              <span className={`badge ${member.activo ? 'success' : 'neutral'}`}>
                {member.activo ? 'Acceso activo' : 'Sin acceso'}
              </span>
              <Link className="button secondary" to={`${base}/equipo/miembros/${member.id}`}>
                {access.es_propietario ? 'Gestionar' : 'Ver acceso'}
                <span className="visually-hidden"> de {member.nombre}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
