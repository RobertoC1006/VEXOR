import { Navigate } from 'react-router-dom';

import { useWorkspace } from '../compartido/acceso/workspace';

export function WorkspaceHome() {
  const { data } = useWorkspace();
  return <Navigate to={data?.me.administrador_plataforma ? '/plataforma' : '/negocios'} replace />;
}
