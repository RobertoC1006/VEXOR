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
import { SessionProvider, useSession } from './state/session';
import { WorkspaceProvider } from './state/workspace';
import { AppLayout } from './components/layout';
import { Button, Loading } from './components/ui';
import { LoginPage, RecoveryPage, CallbackPage, PasswordPage } from './pages/auth-pages';
import {
  BusinessesPage,
  DashboardPage,
  InvitationsPage,
  WorkspaceGate,
} from './pages/workspace-pages';
import './styles.css';
import { PlatformArea, WorkspaceHome } from './pages/area-routing';
import {
  PlatformDashboardPage,
  PlatformBusinessesPage,
  PlatformInvitationsPage,
} from './pages/platform-pages';
import { NewBusinessInvitationPage } from './pages/platform-invitation-form';

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
                  <Route path="/negocios/:negocioId" element={<DashboardPage />} />
                  <Route path="/invitaciones" element={<InvitationsPage />} />
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
