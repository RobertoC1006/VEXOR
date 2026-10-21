import { NavLink, Outlet } from 'react-router-dom';
import { useBusiness } from '../negocio/context';
import { Notice } from '../../compartido/componentes/ui';

export function TeamLayout() {
  const { base, can, access } = useBusiness();
  if (!can('equipo.ver'))
    return (
      <section className="panel settings-panel">
        <h1>Acceso al equipo</h1>
        <Notice>Necesitas autorización para consultar el equipo de este negocio.</Notice>
      </section>
    );
  return (
    <>
      <nav className="settings-tabs" aria-label="Secciones del equipo">
        <NavLink to={`${base}/equipo`} end>
          Personas
        </NavLink>
        <NavLink to={`${base}/equipo/roles`}>Roles y permisos</NavLink>
        {access.es_propietario && (
          <NavLink to={`${base}/equipo/invitaciones`}>Invitaciones</NavLink>
        )}
      </nav>
      <Outlet />
    </>
  );
}
