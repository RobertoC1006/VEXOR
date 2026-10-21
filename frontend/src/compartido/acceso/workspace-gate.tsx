import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ApiError } from '../api/api';

import { useWorkspace } from './workspace';
import { Button, Loading, Notice } from '../componentes/ui';

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { loading, error, reload } = useWorkspace();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="standalone-error">
        <ShieldCheck size={34} />
        <h1>
          {error instanceof ApiError && error.status === 403
            ? 'Acceso denegado'
            : 'No pudimos cargar tu espacio'}
        </h1>
        <Notice>{error.message}</Notice>
        <Button onClick={() => void reload()}>Volver a intentar</Button>
        <Link to="/ingresar">Volver al acceso</Link>
      </div>
    );
  return children;
}
