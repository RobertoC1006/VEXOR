import { Button, Loading, Notice } from '../../compartido/componentes/ui';

import { usePlatform } from '../estado/platform';

import { ApiError } from '../../compartido/api/api';

export function PlatformStatus() {
  const { loading, error, reload } = usePlatform();
  if (loading) return <Loading text="Cargando la administración de VEXOR…" />;
  if (error)
    return (
      <>
        <h1>
          {error instanceof ApiError && error.status === 403
            ? 'Acceso denegado'
            : 'No pudimos cargar la plataforma'}
        </h1>
        <Notice>
          {error instanceof ApiError && error.status === 403
            ? 'Tu cuenta ya no tiene acceso a la administración de VEXOR.'
            : error.message}
        </Notice>
        <Button onClick={() => void reload()}>Volver a intentar</Button>
      </>
    );
  return null;
}
