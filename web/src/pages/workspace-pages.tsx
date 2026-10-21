import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Access, BusinessDetail } from '../lib/types';
import { useWorkspace } from '../state/workspace';
import { Button, Empty, Loading, Notice } from '../components/ui';
import { BusinessSwitch } from '../components/layout';

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
export function BusinessesPage() {
  const { data, reload } = useWorkspace();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU ESPACIO VEXOR</span>
          <h1>Todo empieza en tu negocio.</h1>
          <p>Selecciona el negocio con el que vas a trabajar hoy.</p>
        </div>
        <Button variant="secondary" onClick={() => void reload()}>
          <RefreshCw size={17} /> Actualizar
        </Button>
      </div>
      {!!data?.invitations.length && (
        <Link className="invitation-banner" to="/invitaciones">
          <span className="icon-tile">
            <Mail size={23} />
          </span>
          <div>
            <strong>
              Tienes{' '}
              {data.invitations.length === 1
                ? 'una invitación pendiente'
                : `${data.invitations.length} invitaciones pendientes`}
            </strong>
            <p>Revisa y acepta tu acceso para empezar.</p>
          </div>
          <ArrowRight size={21} />
        </Link>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Mis negocios <span className="count">{data?.businesses.length ?? 0}</span>
          </h2>
          <span>Accesos activos</span>
        </div>
        {data?.businesses.length ? (
          <div className="business-grid">
            {data.businesses.map((b) => (
              <Link className="business-card" to={`/negocios/${b.negocio_id}`} key={b.negocio_id}>
                <div className="business-card-top">
                  <span className="business-monogram">{b.nombre.slice(0, 1).toUpperCase()}</span>
                  <span className="badge success">
                    <CheckCircle2 size={12} /> Activo
                  </span>
                </div>
                <h3>{b.nombre}</h3>
                <p>
                  <MapPin size={14} />
                  {b.zona_horaria.replace('America/', '').replaceAll('_', ' ')}
                </p>
                <div className="business-card-bottom">
                  <span>
                    <UserRound size={15} />
                    {b.es_propietario ? 'Propietario' : 'Miembro del equipo'}
                  </span>
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Tu próximo paso está en tu correo">
            Todavía no tienes un negocio asignado. Abre tu invitación o solicita al propietario que
            te incorpore.
          </Empty>
        )}
      </section>
      {data?.me.administrador_plataforma && (
        <section className="admin-note">
          <ShieldCheck size={22} />
          <div>
            <h2>Administración de VEXOR</h2>
            <p>
              Esta es tu área comercial. La gestión de las altas de otros negocios está en
              <Link to="/plataforma"> Administración de VEXOR</Link>.
            </p>
          </div>
        </section>
      )}
      <div className="quiet-note">
        <ShieldCheck size={17} />
        <p>Solo tú y las personas autorizadas pueden acceder a los datos de cada negocio.</p>
      </div>
    </>
  );
}
export function InvitationsPage() {
  const { data, reload } = useWorkspace(),
    navigate = useNavigate(),
    [pending, setPending] = useState(''),
    [error, setError] = useState('');
  async function accept(id: string) {
    setPending(id);
    setError('');
    try {
      const result = await api<{ negocio_id: string }>(`/me/invitaciones/${id}/aceptar`, {
        method: 'POST',
      });
      await reload();
      navigate(`/negocios/${result.negocio_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending('');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CRECEMOS EN EQUIPO</span>
          <h1>Invitaciones para ti</h1>
          <p>Estas invitaciones están vinculadas a {data?.me.email}.</p>
        </div>
        <Button variant="secondary" onClick={() => void reload()}>
          <RefreshCw size={17} /> Actualizar
        </Button>
      </div>
      {error && <Notice>{error}</Notice>}
      <section className="panel">
        {data?.invitations.length ? (
          <div className="invitation-list">
            {data.invitations.map((i) => (
              <article className="invitation-card" key={i.id}>
                <span className="icon-tile">
                  <Mail size={25} />
                </span>
                <div>
                  <span className="badge">
                    {i.tipo === 'alta_negocio'
                      ? 'Invitación de propietario'
                      : 'Invitación de acceso'}
                  </span>
                  <h2>{i.negocio_nombre}</h2>
                  <p>Hola, {i.nombre}. Te invitaron a formar parte de este negocio.</p>
                  <small>
                    <Clock3 size={14} /> Disponible hasta el{' '}
                    {new Intl.DateTimeFormat('es-PE', {
                      dateStyle: 'medium',
                      timeZone: 'America/Lima',
                    }).format(new Date(i.vence_en))}
                  </small>
                </div>
                <Button
                  busy={pending === i.id}
                  disabled={!!pending}
                  onClick={() => void accept(i.id)}
                >
                  Aceptar invitación <ArrowRight size={18} />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Estás al día">
            No tienes invitaciones pendientes. Si esperabas una, verifica que ingresaste con el
            correo que recibió la invitación.
            <Link className="button secondary" to="/negocios">
              Ir a mis negocios <ArrowRight size={17} />
            </Link>
          </Empty>
        )}
      </section>
      <p className="quiet-note">
        Si el enlace de tu correo venció, solicita al remitente una nueva invitación.
      </p>
    </>
  );
}
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
