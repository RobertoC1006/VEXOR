import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Building2, House, MapPin, Users, Package, ClipboardList } from 'lucide-react';
import { AppLayout } from '../compartido/layouts/app-layout';
import { BusinessProvider, useBusiness } from './negocio/context';
import { BusinessSwitch } from './mis-negocios/componentes/business-switch';

function BusinessLayout() {
  const { base, can, business } = useBusiness();
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
      <BusinessSwitch name={business.nombre} />
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
