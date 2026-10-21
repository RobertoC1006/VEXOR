import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button, Loading, Notice } from '../components/ui';
import { InvitationList } from '../components/platform-invitations';
import { usePlatform } from '../state/platform';
import { useWorkspace } from '../state/workspace';
import { ApiError } from '../lib/api';
import { invitationState, platformSummary } from '../lib/platform';

function PlatformStatus() {
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
export function PlatformDashboardPage() {
  const { data } = useWorkspace(),
    { invitations, loading, error, reload } = usePlatform();
  if (loading || error) return <PlatformStatus />;
  const summary = platformSummary(invitations),
    firstName = data?.me.perfil?.nombre.split(' ')[0];
  const stats = [
    {
      label: 'Solicitudes de alta',
      value: summary.total,
      icon: Building2,
      to: '/plataforma/invitaciones',
      hint: 'Todas las solicitudes',
    },
    {
      label: 'Altas completadas',
      value: summary.accepted,
      icon: CheckCircle2,
      to: '/plataforma/negocios',
      hint: 'Propietarios que aceptaron',
    },
    {
      label: 'Por aceptar',
      value: summary.pending,
      icon: Clock3,
      to: '/plataforma/invitaciones?estado=pendiente',
      hint: 'Invitaciones vigentes',
    },
    {
      label: 'Correos por revisar',
      value: summary.mailErrors,
      icon: Mail,
      to: '/plataforma/invitaciones?estado=correo',
      hint: 'Envíos pendientes con error',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN DE VEXOR</span>
          <h1>{firstName ? `¡Bienvenido, ${firstName}!` : 'Bienvenido a VEXOR'}</h1>
          <p>Gestiona la incorporación de negocios a tu plataforma.</p>
        </div>
        <Link className="button primary" to="/plataforma/invitaciones/nueva">
          <Plus size={18} /> Registrar negocio
        </Link>
      </div>
      <div className="platform-stat-grid">
        {stats.map((s) => (
          <Link className="platform-stat" key={s.label} to={s.to}>
            <div>
              <span>{s.label}</span>
              <s.icon size={20} />
            </div>
            <strong>{s.value}</strong>
            <small>
              {s.hint}
              <ArrowRight size={14} />
            </small>
          </Link>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Últimas solicitudes</h2>
          <Link to="/plataforma/invitaciones">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <InvitationList items={invitations.slice(0, 5)} />
      </section>
      <div className="platform-bottom-grid">
        <section className="panel platform-next">
          <span className="icon-tile">
            <Building2 size={26} />
          </span>
          <h2>El próximo negocio empieza aquí.</h2>
          <p>
            Registra sus datos e invita a su propietario. El negocio se incorpora cuando acepta.
          </p>
          <Link to="/plataforma/invitaciones/nueva">
            Registrar negocio <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel platform-next">
          <span className="icon-tile">
            <ShieldCheck size={26} />
          </span>
          <h2>Dos áreas. Una sola cuenta.</h2>
          <p>
            Esta es la administración del SaaS. Para trabajar dentro de un negocio necesitas una
            membresía comercial propia.
          </p>
          <Link to="/negocios">
            Ir al área de negocio <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="platform-footer-note">
        <Button variant="ghost" onClick={() => void reload()}>
          <RefreshCw size={15} /> Actualizar resumen
        </Button>
        <span>Resumen de solicitudes de incorporación. No incluye facturación ni ventas.</span>
      </div>
    </>
  );
}
export function PlatformBusinessesPage() {
  const { invitations, loading, error } = usePlatform(),
    [search, setSearch] = useState('');
  if (loading || error) return <PlatformStatus />;
  const accepted = invitations.filter((i) => invitationState(i) === 'aceptada');
  const visible = accepted.filter((i) =>
    `${i.negocio_nombre} ${i.email} ${i.nombre}`
      .toLocaleLowerCase('es')
      .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU PLATAFORMA</span>
          <h1>Negocios incorporados</h1>
          <p>Altas completadas mediante una invitación de VEXOR.</p>
        </div>
        <Link className="button primary" to="/plataforma/invitaciones/nueva">
          <Plus size={18} /> Registrar negocio
        </Link>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Altas completadas <span className="count">{accepted.length}</span>
          </h2>
        </div>
        <SearchField value={search} onChange={setSearch} />
        <InvitationList items={visible} completed />
      </section>
      <Notice tone="info">
        Estos registros muestran el alta y el destinatario de la invitación. Administrar VEXOR no
        concede acceso a la operación privada de cada negocio.
      </Notice>
    </>
  );
}
function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="platform-search">
      <Search size={17} />
      <span className="visually-hidden">Buscar negocio o correo</span>
      <input
        type="search"
        placeholder="Buscar negocio, propietario o correo…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function PlatformInvitationsPage() {
  const { invitations, loading, error, reload } = usePlatform(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState('');
  if (loading || error) return <PlatformStatus />;
  const filter = params.get('estado') ?? 'todas';
  const items = invitations.filter(
    (i) =>
      (filter === 'todas' ||
        (filter === 'correo' && invitationState(i) === 'pendiente' && i.estado_envio === 'error') ||
        invitationState(i) === filter) &&
      `${i.negocio_nombre} ${i.email} ${i.nombre}`
        .toLocaleLowerCase('es')
        .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INCORPORACIÓN DE NEGOCIOS</span>
          <h1>Invitaciones de la plataforma</h1>
          <p>Revisa el envío y la aceptación de cada solicitud de alta.</p>
        </div>
        <Link className="button primary" to="/plataforma/invitaciones/nueva">
          <Plus size={18} /> Registrar negocio
        </Link>
      </div>
      <section className="panel">
        <div className="platform-toolbar">
          <SearchField value={search} onChange={setSearch} />
          <Button variant="secondary" onClick={() => void reload()}>
            <RefreshCw size={16} /> Actualizar
          </Button>
        </div>
        <div className="platform-filters" role="group" aria-label="Filtrar invitaciones">
          {[
            ['todas', 'Todas'],
            ['pendiente', 'Por aceptar'],
            ['aceptada', 'Aceptadas'],
            ['correo', 'Correo por revisar'],
            ['vencida', 'Vencidas'],
            ['revocada', 'Revocadas'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setParams(value === 'todas' ? {} : { estado: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <InvitationList items={items} manage />
      </section>
      <p className="quiet-note">
        “Aceptado por el proveedor” no confirma que el mensaje llegó a la bandeja de entrada.
      </p>
    </>
  );
}
