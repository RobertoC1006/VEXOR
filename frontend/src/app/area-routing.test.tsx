import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  admin: false,
  provider: vi.fn(),
  businesses: [] as { negocio_id: string }[],
  invitations: [] as { id: string }[],
}));
vi.mock('../compartido/acceso/workspace', () => ({
  useWorkspace: () => ({
    data: {
      me: { administrador_plataforma: mock.admin },
      businesses: mock.businesses,
      invitations: mock.invitations,
    },
  }),
}));
vi.mock('../proveedor/estado/platform', () => ({
  PlatformProvider: ({ children }: { children: ReactNode }) => {
    mock.provider();
    return children;
  },
}));
vi.mock('../compartido/layouts/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => children ?? <Outlet />,
}));
import { PlatformArea } from '../proveedor/area';
import { WorkspaceHome } from './workspace-home';
afterEach(() => {
  cleanup();
  mock.businesses = [];
  mock.invitations = [];
});
function home(admin: boolean) {
  mock.admin = admin;
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<WorkspaceHome />} />
        <Route path="/plataforma" element={<h1>Área SaaS</h1>} />
        <Route path="/negocios" element={<h1>Área comercial</h1>} />
        <Route path="/invitaciones" element={<h1>Invitación pendiente</h1>} />
        <Route path="/negocios/:negocioId" element={<h1>Negocio seleccionado</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
it('el administrador entra a la plataforma con la misma identidad', () => {
  home(true);
  expect(screen.getByText('Área SaaS')).toBeTruthy();
});
it('el usuario comercial entra al área de negocio', () => {
  home(false);
  expect(screen.getByText('Área comercial')).toBeTruthy();
});
it('una cuenta nueva entra directamente a su invitación pendiente', () => {
  mock.invitations = [{ id: 'invite' }];
  home(false);
  expect(screen.getByText('Invitación pendiente')).toBeTruthy();
});
it('con un solo negocio se continúa en él sin volver al selector', () => {
  mock.businesses = [{ negocio_id: 'A' }];
  home(false);
  expect(screen.getByText('Negocio seleccionado')).toBeTruthy();
});
it('una URL de plataforma no monta su proveedor de datos para un usuario comercial', () => {
  mock.admin = false;
  render(
    <MemoryRouter>
      <PlatformArea />
    </MemoryRouter>,
  );
  expect(screen.getByText('Acceso denegado')).toBeTruthy();
  expect(mock.provider).not.toHaveBeenCalled();
});
