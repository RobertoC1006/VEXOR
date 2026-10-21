import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Building2, House, LogOut, Mail, Menu, ShieldCheck, X } from 'lucide-react';
import { Brand, Button, Notice } from '../componentes/ui';
import { useWorkspace } from '../acceso/workspace';
import { useSession } from '../autenticacion/session';
import { InstallButton } from '../componentes/install-button';

export function AppLayout({
  area = 'business',
  children,
  navigation,
}: {
  area?: 'business' | 'platform';
  children?: ReactNode;
  navigation?: ReactNode;
}) {
  const { data } = useWorkspace(),
    { signOut } = useSession(),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    document.querySelector<HTMLElement>('#main-content')?.focus();
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const items = document.querySelectorAll<HTMLElement>(
          '.mobile-drawer a,.mobile-drawer button',
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      document.querySelector<HTMLElement>('.mobile-menu')?.focus();
    };
  }, [open]);
  const name = data?.me.perfil?.nombre ?? data?.me.email ?? '';
  const selected = data?.businesses.find((b) => location.pathname.includes(b.negocio_id));
  const platform = area === 'platform';
  const home = platform ? '/plataforma' : '/negocios';
  const areaSwitch = data?.me.administrador_plataforma ? (
    <Link className="area-switch" to={platform ? '/negocios' : '/plataforma'}>
      {platform ? <Building2 size={18} /> : <ShieldCheck size={18} />}
      <span>{platform ? 'Ir al área de negocio' : 'Administración de VEXOR'}</span>
      <ArrowLeftRight size={16} />
    </Link>
  ) : null;
  const links =
    navigation ??
    (platform ? (
      <>
        <NavLink to="/plataforma" end>
          <House size={19} /> Inicio
        </NavLink>
        <NavLink to="/plataforma/negocios">
          <Building2 size={19} /> Negocios
        </NavLink>
        <NavLink to="/plataforma/invitaciones">
          <Mail size={19} /> Invitaciones
        </NavLink>
      </>
    ) : (
      <>
        {selected ? (
          <NavLink to={`/negocios/${selected.negocio_id}`} end>
            <House size={19} /> Inicio
          </NavLink>
        ) : (
          <Link to="/negocios">
            <House size={19} /> Inicio
          </Link>
        )}
        <NavLink to="/negocios" end>
          <Building2 size={19} /> Mis negocios
        </NavLink>
        <NavLink to="/invitaciones">
          <Mail size={19} /> Invitaciones{' '}
          {!!data?.invitations.length && <span className="count">{data.invitations.length}</span>}
        </NavLink>
      </>
    ));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <aside className="sidebar">
        <Link to={home} className="sidebar-brand">
          <Brand />
        </Link>
        <span className="nav-caption">
          {platform ? 'ADMINISTRACIÓN DEL SAAS' : 'ÁREA DE NEGOCIO'}
        </span>
        <nav aria-label="Principal">{links}</nav>
        <div className="sidebar-area-switch">{areaSwitch}</div>
        <div className="sidebar-bottom">
          <ShieldCheck size={20} />
          <p>
            {platform ? 'Administración de la plataforma' : 'Tu negocio, en buenas manos.'}
            <small>Acceso personal y protegido</small>
          </p>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <Link className="mobile-brand" to={home}>
            <Brand />
          </Link>
          <div className="breadcrumb">
            <span>{platform ? 'Plataforma' : 'Área de negocio'}</span>
            <span>/</span>
            <strong>
              {platform ? 'Administración de VEXOR' : (selected?.nombre ?? 'Mis negocios')}
            </strong>
          </div>
          <div className="topbar-account">
            <InstallButton />
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>
                {platform
                  ? 'Administrador de VEXOR'
                  : selected
                    ? selected.es_propietario
                      ? 'Propietario del negocio'
                      : 'Miembro del equipo'
                    : 'Área de negocio'}
              </small>
            </div>
            <button
              className="icon-button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={() => {
                void signOut().catch((e: Error) => setError(e.message));
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {areaSwitch && (
          <div className="mobile-area-bar">
            <span>{platform ? 'Administración de VEXOR' : 'Área de negocio'}</span>
            {areaSwitch}
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {error && <Notice>{error}</Notice>}
          {children ?? <Outlet />}
        </main>
        <footer className="app-footer">
          <Brand />
          <span>
            {platform
              ? 'Administración central de la plataforma.'
              : 'Hecho para el día a día de tu negocio.'}
          </span>
          <span>Perú</span>
        </footer>
      </div>
      <nav
        className={`bottom-nav ${navigation ? 'business-nav' : ''}`}
        aria-label="Navegación móvil"
      >
        {links}
      </nav>
      {open && (
        <div className="menu-overlay">
          <button
            className="menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menú">
            <div>
              <Brand />
              <button
                autoFocus
                className="icon-button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <nav>{links}</nav>
            {areaSwitch}
            <Button
              variant="secondary"
              onClick={() => {
                void signOut().catch((e: Error) => setError(e.message));
              }}
            >
              <LogOut size={18} /> Cerrar sesión
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
