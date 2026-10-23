import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { SessionProvider, useSession } from '../compartido/autenticacion/session';
import { WorkspaceProvider } from '../compartido/acceso/workspace';
import { AppLayout } from '../compartido/layouts/app-layout';
import { Button, Loading } from '../compartido/componentes/ui';
import {
  LoginPage,
  RecoveryPage,
  CallbackPage,
  PasswordPage,
} from '../compartido/autenticacion/paginas/auth-pages';
import { BusinessesPage } from '../comerciante/mis-negocios/paginas/businesses-page';
import { DashboardPage } from '../comerciante/inicio/paginas/dashboard-page';
import { InvitationsPage } from '../comerciante/equipo/paginas/invitations-page';
import { WorkspaceGate } from '../compartido/acceso/workspace-gate';
import './styles.css';
import { PlatformArea } from '../proveedor/area';
import { WorkspaceHome } from './workspace-home';
import { PlatformDashboardPage } from '../proveedor/inicio/paginas/dashboard-page';
import { PlatformBusinessesPage } from '../proveedor/negocios/paginas/businesses-page';
import { PlatformInvitationsPage } from '../proveedor/invitaciones/paginas/invitations-page';
import { NewBusinessInvitationPage } from '../proveedor/invitaciones/paginas/invitation-form';
import { BusinessArea } from '../comerciante/area';
import { BusinessSettingsPage } from '../comerciante/negocio/paginas/business-settings-page';
import { OnboardingPage } from '../comerciante/negocio/paginas/onboarding-page';
import { LocalsPage } from '../comerciante/locales/paginas/locals-page';
import { TeamLayout } from '../comerciante/equipo/layout';
import { TeamPage } from '../comerciante/equipo/paginas/team-page';
import { RolesPage } from '../comerciante/equipo/paginas/roles-page';
import { MemberPage } from '../comerciante/equipo/paginas/member-page';
import { TeamInvitationsPage } from '../comerciante/equipo/paginas/team-invitations-page';
import { ProductsPage } from '../comerciante/productos/paginas/products-page';
import { InventoryPage } from '../comerciante/inventario/paginas/inventory-page';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="standalone-error">
        <h1>No pudimos mostrar tu espacio.</h1>
        <p>Vuelve a cargar la página para continuar.</p>
        <Button onClick={() => location.reload()}>Volver a cargar</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Protected() {
  const { session, loading } = useSession(),
    location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/ingresar" replace />;
  if (
    sessionStorage.getItem('vexor:password-pending') === session.user.id &&
    location.pathname !== '/establecer-contrasena'
  )
    return <Navigate to="/establecer-contrasena" replace />;
  return <Outlet />;
}
function Workspace() {
  return (
    <WorkspaceProvider>
      <WorkspaceGate>
        <Outlet />
      </WorkspaceGate>
    </WorkspaceProvider>
  );
}
function NetworkStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    addEventListener('online', update);
    addEventListener('offline', update);
    return () => {
      removeEventListener('online', update);
      removeEventListener('offline', update);
    };
  }, []);
  return offline ? (
    <div className="network-status" role="status">
      <WifiOff size={17} /> No tienes conexión. Conéctate para consultar tu negocio.
    </div>
  ) : null;
}
function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <BrowserRouter>
          <NetworkStatus />
          <Routes>
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/recuperar" element={<RecoveryPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route element={<Protected />}>
              <Route path="/establecer-contrasena" element={<PasswordPage />} />
              <Route element={<Workspace />}>
                <Route path="/" element={<WorkspaceHome />} />
                <Route element={<AppLayout />}>
                  <Route path="/negocios" element={<BusinessesPage />} />
                  <Route path="/invitaciones" element={<InvitationsPage />} />
                </Route>
                <Route path="/negocios/:negocioId" element={<BusinessArea />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="configuracion" element={<BusinessSettingsPage />} />
                  <Route path="onboarding" element={<OnboardingPage />} />
                  <Route path="locales" element={<LocalsPage />} />
                  <Route path="productos" element={<ProductsPage />} />
                  <Route path="inventario" element={<InventoryPage />} />
                  <Route path="equipo" element={<TeamLayout />}>
                    <Route index element={<TeamPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="invitaciones" element={<TeamInvitationsPage />} />
                    <Route path="miembros/:miembroId" element={<MemberPage />} />
                  </Route>
                </Route>
                <Route element={<PlatformArea />}>
                  <Route path="/plataforma" element={<PlatformDashboardPage />} />
                  <Route path="/plataforma/negocios" element={<PlatformBusinessesPage />} />
                  <Route path="/plataforma/invitaciones" element={<PlatformInvitationsPage />} />
                  <Route
                    path="/plataforma/invitaciones/nueva"
                    element={<NewBusinessInvitationPage />}
                  />
                </Route>
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <main className="standalone-error">
                  <h1>Esta página no está disponible.</h1>
                  <Link className="button primary" to="/">
                    Volver a mi espacio
                  </Link>
                </main>
              }
            />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </ErrorBoundary>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Online access remains available if installation is unavailable. */
    });
  });
}
