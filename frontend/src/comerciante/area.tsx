import { Navigate, NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import { Building2, House, MapPin, Users, Package, ClipboardList } from 'lucide-react';
import { AppLayout } from '../compartido/layouts/app-layout';
import { BusinessProvider, useBusiness } from './negocio/context';
import { Notice } from '../compartido/componentes/ui';

function BusinessLayout() {
  const { base, can, business, access } = useBusiness();
  const location = useLocation();
  if ((business.onboarding_paso ?? 3) < 3) {
    if (!access.es_propietario)
      return (
        <AppLayout navigation={<NavLink to="/negocios">Mis negocios</NavLink>}>
          <Notice>
            El propietario está preparando este negocio. Podrás empezar cuando termine su
            configuración inicial.
          </Notice>
        </AppLayout>
      );
    if (location.pathname !== `${base}/onboarding`)
      return <Navigate to={`${base}/onboarding`} replace />;
    return (
      <AppLayout
        navigation={
          <NavLink to={`${base}/onboarding`}>
            <Building2 size={19} />
            Configurar mi negocio
          </NavLink>
        }
      >
        <Outlet />
      </AppLayout>
    );
  }
  return (
    <AppLayout
      navigation={
        <>
          <NavLink to={base} end>
            <House size={19} />
            Inicio
          </NavLink>
          <NavLink to={`${base}/configuracion`}>
            <Building2 size={19} />
            Mi negocio
          </NavLink>
          <NavLink to={`${base}/locales`}>
            <MapPin size={19} />
            Puestos y almacenes
          </NavLink>
          {(can('productos.ver') || can('productos.gestionar')) && (
            <>
              <NavLink to={`${base}/productos`}>
                <Package size={19} />
                Productos
              </NavLink>
              <NavLink to={`${base}/inventario`}>
                <ClipboardList size={19} />
                Inventario
              </NavLink>
            </>
          )}
          {can('equipo.ver') && (
            <NavLink to={`${base}/equipo`}>
              <Users size={19} />
              Equipo
            </NavLink>
          )}
        </>
      }
    >
      <Outlet />
    </AppLayout>
  );
}
export function BusinessArea() {
  const { negocioId } = useParams();
  return (
    <BusinessProvider key={negocioId}>
      <BusinessLayout />
    </BusinessProvider>
  );
}
