import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../../locales/types';
import type { IndividualPermission, Member, MemberRole, Permission, Role } from '../types';
import { MemberAccess } from '../componentes/member-access';
import { MemberLocals, MemberRoles } from '../componentes/member-assignments';
import { MemberPermissions } from '../componentes/member-permissions';

export function MemberPage() {
  const { miembroId } = useParams();
  const { base, refresh } = useBusiness();
  const path = `${base}/miembros/${miembroId}`;
  const resource = useResource(path, async (signal) => {
    const [member, roles, locals, assignments, assigned, grants, permissions] = await Promise.all([
      api<Member>(path, { signal }),
      listAll<Role>(`${base}/roles`, signal),
      listAll<BusinessLocal>(`${base}/locales`, signal),
      listAll<MemberRole>(`${path}/roles`, signal),
      listAll<{ local_id: string }>(`${path}/locales`, signal),
      listAll<IndividualPermission>(`${path}/permisos`, signal),
      api<Permission[]>(`${base}/permisos`, { signal }),
    ]);
    return { member, roles, locals, assignments, assigned, grants, permissions };
  });
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  const { member, roles, locals, assignments, assigned, grants, permissions } = resource.data;
  async function saved() {
    await Promise.all([resource.refresh(), refresh()]);
  }
  const assignedLocals = assigned.map((item) => item.local_id);
  return (
    <>
      <Link className="back-link" to={`${base}/equipo`}>
        <ArrowLeft size={16} />
        Volver al equipo
      </Link>
      <PageHeading
        title={member.nombre}
        description={
          member.es_propietario
            ? 'Propietario del negocio'
            : 'Configura dónde trabaja y qué acciones puede realizar.'
        }
      />
      <div className="settings-columns">
        <div className="settings-stack">
          <MemberAccess
            key={`${member.id}:${member.activo}:${member.es_propietario}`}
            member={member}
            onSaved={saved}
          />
          <MemberLocals
            key={`${member.id}:${assignedLocals.join(',')}:${member.es_propietario}`}
            member={member}
            locals={locals}
            assigned={assignedLocals}
            onSaved={saved}
          />
        </div>
        <MemberRoles
          key={member.id}
          member={member}
          locals={locals}
          roles={roles}
          assignments={assignments}
          assignedLocals={assignedLocals}
          onSaved={saved}
        />
      </div>
      <MemberPermissions
        key={member.id}
        member={member}
        permissions={permissions}
        locals={locals}
        grants={grants}
        onSaved={saved}
      />
    </>
  );
}
