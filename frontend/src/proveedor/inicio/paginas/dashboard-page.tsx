import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../../compartido/componentes/ui';
import { InvitationList } from '../../invitaciones/componentes/invitation-list';
import { usePlatform } from '../../estado/platform';
import { useWorkspace } from '../../../compartido/acceso/workspace';

import { platformSummary } from '../../invitaciones/platform';
import { PlatformStatus } from '../../componentes/platform-status';
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
