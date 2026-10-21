import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { Notice } from '../components/ui';
import { useWorkspace } from '../state/workspace';
import { PlatformProvider } from '../state/platform';
export function WorkspaceHome() {
  const { data } = useWorkspace();
  return <Navigate to={data?.me.administrador_plataforma ? '/plataforma' : '/negocios'} replace />;
}
export function PlatformArea() {
  const { data } = useWorkspace();
  if (!data?.me.administrador_plataforma)
    return (
      <AppLayout>
        <div className="page-heading">
          <div>
            <h1>Acceso denegado</h1>
            <p>Esta sección está reservada para la administración de VEXOR.</p>
          </div>
        </div>
        <Notice>Tu cuenta puede acceder únicamente a las áreas que tiene autorizadas.</Notice>
        <Link className="button secondary" to="/negocios">
          Ir a mis negocios
        </Link>
      </AppLayout>
    );
  return (
    <PlatformProvider>
      <AppLayout area="platform" />
    </PlatformProvider>
  );
}
