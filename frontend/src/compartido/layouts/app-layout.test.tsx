import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, NavLink } from 'react-router-dom';
import { AppLayout } from './app-layout';
vi.mock('../acceso/workspace', () => ({
  useWorkspace: () => ({
    data: {
      me: { perfil: { nombre: 'Ana' }, administrador_plataforma: false },
      businesses: [{ negocio_id: 'A', nombre: 'Mi negocio', es_propietario: true }],
      invitations: [],
    },
  }),
}));
vi.mock('../autenticacion/session', () => ({ useSession: () => ({ signOut: vi.fn() }) }));
vi.mock('../componentes/install-button', () => ({ InstallButton: () => null }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('ofrece navegación móvil compacta sin claves duplicadas, con todos los módulos en Más y sin header superior', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={['/negocios/A/productos']}>
      <AppLayout
        navigation={
          <>
            <NavLink to="/negocios/A">Inicio</NavLink>
            <NavLink to="/negocios/A/configuracion">Mi negocio</NavLink>
            <>
              <NavLink to="/negocios/A/productos">Productos</NavLink>
              <NavLink to="/negocios/A/inventario">Inventario</NavLink>
            </>
            <NavLink to="/negocios/A/equipo">Equipo</NavLink>
          </>
        }
      >
        <h1>Productos</h1>
      </AppLayout>
    </MemoryRouter>,
  );
  expect(document.querySelector('header')).toBeNull();
  expect(
    within(screen.getByRole('navigation', { name: 'Navegación móvil' })).getAllByRole('link'),
  ).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Menú' }));
  expect(
    within(dialog.getByRole('navigation', { name: 'Todos los módulos' })).getAllByRole('link'),
  ).toHaveLength(5);
  expect(dialog.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  expect(errors.mock.calls.filter((args) => args.join(' ').includes('same key'))).toEqual([]);
});
