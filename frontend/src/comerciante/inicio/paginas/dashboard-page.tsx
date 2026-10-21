import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Globe2,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { api, ApiError } from '../../../compartido/api/api';
import type { Access, BusinessDetail } from '../../negocio/types';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { Button, Empty, Loading, Notice } from '../../../compartido/componentes/ui';
import { BusinessSwitch } from '../../mis-negocios/componentes/business-switch';

const actionNames: Record<string, string> = {
  'negocio.editar': 'Editar información del negocio',
  'equipo.ver': 'Consultar el equipo',
  'equipo.gestionar': 'Gestionar el equipo',
  'locales.gestionar': 'Gestionar locales',
};

export function DashboardPage() {
  const { negocioId } = useParams(),
    { data } = useWorkspace(),
    [context, setContext] = useState<{ business: BusinessDetail; access: Access } | null>(null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    setOffset(0);
    setContext(null);
  }, [negocioId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      api<BusinessDetail>(`/negocios/${negocioId}`, { signal: controller.signal }),
      api<Access>(`/negocios/${negocioId}/acceso?limit=6&offset=${offset}`, {
        signal: controller.signal,
      }),
    ])
      .then(([business, access]) => {
        if (!controller.signal.aborted) setContext({ business, access });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setContext(null);
          setError(e);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [negocioId, revision, offset]);
  if (loading || (context && context.business.id !== negocioId))
    return <Loading text="Cargando tu negocio…" />;
  if (error)
    return (
      <>
        <div className="page-heading">
          <h1>
            {error instanceof ApiError && error.status === 403
              ? 'Acceso denegado'
              : 'No pudimos abrir este negocio'}
          </h1>
        </div>
        <Notice>{error.message}</Notice>
        <div className="actions">
          <Link className="button secondary" to="/negocios">
            Elegir otro negocio
          </Link>
          <Button onClick={() => setRevision((v) => v + 1)}>Volver a intentar</Button>
        </div>
      </>
    );
  if (!context) return null;
  const { business, access } = context,
    name = data?.me.perfil?.nombre?.split(' ')[0] ?? 'de nuevo';
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">ASÍ ESTÁ TU NEGOCIO</span>
          <h1>¡Hola, {name}!</h1>
          <p>Qué gusto tenerte aquí. Este es tu espacio de trabajo.</p>
        </div>
        <span className="date">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat('es-PE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: business.zona_horaria,
          }).format(new Date())}
        </span>
      </div>
      <BusinessSwitch name={business.nombre} />
      <section className="welcome-panel">
        <div>
          <span className="badge">
            <Check size={13} /> Tu espacio está listo
          </span>
          <h2>
            Tu negocio,
            <br />
            en un solo lugar.
          </h2>
          <p>
            Tu negocio y tu equipo, en el mismo lugar.
            <br />
            Empieza por conocer tu acceso.
          </p>
          <Link to="/invitaciones">
            Revisar mis invitaciones <ArrowRight size={17} />
          </Link>
        </div>
        <div className="welcome-symbol">
          <Store size={104} strokeWidth={1} />
          <span className="symbol-check">
            <Check size={24} />
          </span>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Información del negocio</h2>
            <Building2 size={18} />
          </div>
          <dl className="info-list">
            <div>
              <dt>Nombre comercial</dt>
              <dd>{business.nombre}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <span className="badge success">{business.activo ? 'Activo' : 'Inactivo'}</span>
              </dd>
            </div>
            <div>
              <dt>Zona horaria</dt>
              <dd>{business.zona_horaria}</dd>
            </div>
            <div>
              <dt>Tu vínculo</dt>
              <dd>{access.es_propietario ? 'Propietario' : 'Miembro del equipo'}</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Tu acceso</h2>
            <ShieldCheck size={18} />
          </div>
          <div className="access-summary">
            <span className="icon-tile">
              <ShieldCheck size={25} />
            </span>
            <div>
              <strong>
                {access.es_propietario ? 'Acceso de propietario' : 'Acceso del equipo'}
              </strong>
              <p>
                {access.es_propietario
                  ? 'Puedes administrar este negocio.'
                  : 'Las acciones dependen de tus permisos asignados.'}
              </p>
            </div>
          </div>
          <div className="permission-list">
            {access.acciones
              .filter((a) => a.alcance === 'negocio')
              .map((a) => (
                <div key={a.codigo}>
                  <span>{actionNames[a.codigo] ?? a.codigo}</span>
                  <span className={`badge ${a.permitido ? 'success' : 'neutral'}`}>
                    {a.permitido ? 'Permitido' : 'Sin permiso'}
                  </span>
                </div>
              ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Puestos y almacenes</h2>
          <span>Locales a los que tienes acceso</span>
        </div>
        {access.locales.length ? (
          <div className="local-grid">
            {access.locales.map((l) => (
              <article className="local-card" key={l.id}>
                <span className="icon-tile">
                  <Store size={23} />
                </span>
                <div>
                  <h3>{l.nombre}</h3>
                  <p>{l.habilitado_venta ? 'Puesto de venta' : 'Almacén'}</p>
                </div>
                <span className={`badge ${l.activo ? 'success' : 'neutral'}`}>
                  {l.activo ? 'Activo' : 'Inactivo'}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Todavía no hay locales visibles">
            {access.es_propietario
              ? 'Los puestos y almacenes aparecerán aquí cuando se configuren.'
              : 'Solicita al propietario que te asigne un puesto o almacén para trabajar.'}
          </Empty>
        )}
        {(offset > 0 || access.locales.length === 6) && (
          <div className="pagination">
            <Button
              variant="secondary"
              disabled={!offset}
              onClick={() => setOffset((v) => Math.max(0, v - 6))}
            >
              Anterior
            </Button>
            <span>Página {offset / 6 + 1}</span>
            <Button
              variant="secondary"
              disabled={access.locales.length < 6}
              onClick={() => setOffset((v) => v + 6)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </section>
      <div className="coming-next">
        <span className="icon-tile">
          <Globe2 size={23} />
        </span>
        <div>
          <strong>Un espacio que crece con tu negocio</strong>
          <p>Ventas, inventario y trabajo sin conexión estarán disponibles en próximas entregas.</p>
        </div>
      </div>
    </>
  );
}
