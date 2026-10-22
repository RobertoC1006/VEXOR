import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Building2, House, LogOut, Mail, Menu, ShieldCheck } from 'lucide-react';
import { Brand, Button, Notice } from '../componentes/ui';
import { useWorkspace } from '../acceso/workspace';
import { useSession } from '../autenticacion/session';
import { Modal } from '../componentes/modal';
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
  const account = (
    <div className="layout-account" aria-label="Tu cuenta">
      {selected && (
        <Link className="account-business" to="/negocios">
          {selected.nombre}
          <small>Cambiar de negocio</small>
        </Link>
      )}
      <div className="account-identity">
        <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{name}</strong>
          <small>
            {platform
              ? 'Administrador de VEXOR'
              : selected?.es_propietario
                ? 'Propietario del negocio'
                : 'Miembro del equipo'}
          </small>
        </div>
      </div>
      <InstallButton />
      <Button
        variant="ghost"
        onClick={() => {
          void signOut().catch((e: Error) => {
            setError(e.message);
            setOpen(false);
          });
        }}
      >
        <LogOut size={18} /> Cerrar sesión
      </Button>
    </div>
  );
  function flatten(nodes: ReactNode): ReactNode[] {
    return Children.toArray(nodes).flatMap((node) =>
      isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment
        ? flatten(node.props.children)
        : [node],
    );
  }
  const mobileLinks = flatten(links).filter((node, index) => {
    if (!navigation) return index < 3;
    if (!isValidElement<{ to?: string }>(node)) return false;
    return index === 0 || /\/(productos|inventario)$/.test(node.props.to ?? '');
  });
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
        <div className="sidebar-bottom">
          {areaSwitch}
          {account}
        </div>
      </aside>
      <div className="app-body">
        <main id="main-content" tabIndex={-1}>
          {error && <Notice>{error}</Notice>}
          {children ?? <Outlet />}
        </main>
        <footer className="app-footer">
          <div className="mobile-account">
            {areaSwitch}
            {account}
          </div>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {mobileLinks}
        <button
          className="bottom-menu"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>
      {open && (
        <Modal label="Menú" onClose={() => setOpen(false)}>
          <nav aria-label="Todos los módulos">{links}</nav>
          {areaSwitch}
          {account}
        </Modal>
      )}
    </div>
  );
}
