import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { useWorkspace } from '../../../compartido/acceso/workspace';
import { Button, Empty } from '../../../compartido/componentes/ui';

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
