import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { useBusiness } from '../../negocio/context';

export function DashboardPage() {
  const { business, access, base, can } = useBusiness();
  const { data } = useWorkspace();
  const firstName = data?.me.perfil?.nombre?.split(' ')[0] ?? 'de nuevo';
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
          <h1>¡Hola, {firstName}!</h1>
          <p>Prepara tu negocio y organiza a las personas que trabajan contigo.</p>
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
      <div className="settings-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Gestiona tu negocio</h2>
            <Building2 size={18} />
          </div>
          <div className="business-actions">
            <Link className="business-action" to={base + '/configuracion'}>
              <span className="icon-tile">
                <Building2 size={23} />
              </span>
              <span>
                <strong>Mi negocio</strong>
                <small>Nombre, rubro y ubicaciones de {business.nombre}.</small>
              </span>
              <ArrowRight size={18} />
            </Link>
            <Link className="business-action" to={base + '/locales'}>
              <span className="icon-tile">
                <MapPin size={23} />
              </span>
              <span>
                <strong>Puestos y almacenes</strong>
                <small>Los espacios donde vendes y guardas tu mercadería.</small>
              </span>
              <ArrowRight size={18} />
            </Link>
            {can('equipo.ver') && (
              <Link className="business-action" to={base + '/equipo'}>
                <span className="icon-tile">
                  <Users size={23} />
                </span>
                <span>
                  <strong>Tu equipo</strong>
                  <small>Personas, roles y permisos de este negocio.</small>
                </span>
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </section>
        <section className="panel settings-panel">
          <ShieldCheck size={24} />
          <h2>Tu acceso</h2>
          <dl className="info-list">
            <div>
              <dt>Tu vínculo</dt>
              <dd>{access.es_propietario ? 'Propietario' : 'Miembro del equipo'}</dd>
            </div>
            <div>
              <dt>Negocio</dt>
              <dd>{business.nombre}</dd>
            </div>
            <div>
              <dt>Rubro</dt>
              <dd>{business.rubro || 'Por completar'}</dd>
            </div>
          </dl>
          <p className="field-hint">
            {access.es_propietario
              ? 'Puedes configurar el negocio y administrar los accesos del equipo.'
              : 'Las acciones disponibles dependen de los permisos que te asigne el propietario.'}
          </p>
        </section>
      </div>
    </>
  );
}
