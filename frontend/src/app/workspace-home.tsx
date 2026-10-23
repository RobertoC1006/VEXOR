import { Navigate } from 'react-router-dom';

import { useWorkspace } from '../compartido/acceso/workspace';

export function WorkspaceHome() {
  const { data } = useWorkspace();
  const destination = data?.me.administrador_plataforma
    ? '/plataforma'
    : data?.invitations?.length && !data?.businesses?.length
      ? '/invitaciones'
      : data?.businesses?.length === 1
        ? `/negocios/${data.businesses[0].negocio_id}`
        : '/negocios';
  return <Navigate to={destination} replace />;
}
