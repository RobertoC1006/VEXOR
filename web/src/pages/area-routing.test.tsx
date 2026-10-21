import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ admin: false, provider: vi.fn() }));
vi.mock('../state/workspace', () => ({
  useWorkspace: () => ({ data: { me: { administrador_plataforma: mock.admin } } }),
}));
vi.mock('../state/platform', () => ({
  PlatformProvider: ({ children }: { children: ReactNode }) => {
    mock.provider();
    return children;
  },
}));
vi.mock('../components/layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => children ?? <Outlet />,
}));
import { PlatformArea, WorkspaceHome } from './area-routing';
afterEach(cleanup);
function home(admin: boolean) {
  mock.admin = admin;
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<WorkspaceHome />} />
        <Route path="/plataforma" element={<h1>Área SaaS</h1>} />
        <Route path="/negocios" element={<h1>Área comercial</h1>} />
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
