import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ api: vi.fn(), saved: vi.fn(), owner: true }));
vi.mock('../../../compartido/api/api', () => ({ api: mock.api }));
vi.mock('../../negocio/context', () => ({
  useBusiness: () => ({ base: '/negocios/A', access: { es_propietario: mock.owner } }),
}));
import { RoleEditor } from './role-editor';
import type { Permission } from '../types';

const permissions: Permission[] = [
  { codigo: 'negocio.editar', descripcion: 'Editar nombre y zona horaria', alcance: 'negocio' },
  { codigo: 'locales.gestionar', descripcion: 'Crear y editar locales', alcance: 'negocio' },
  { codigo: 'locales.ver', descripcion: 'Consultar un local autorizado', alcance: 'local' },
  {
    codigo: 'equipo.ver',
    descripcion: 'Consultar miembros y configuración de acceso',
    alcance: 'negocio',
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  mock.owner = true;
  mock.api.mockImplementation(async (_path, options) => (options?.method ? {} : []));
  mock.saved.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('un nombre libre no concede acceso y Solo consulta prepara únicamente lectura hasta guardar', async () => {
  render(
    <RoleEditor
      role={{ id: 'visita', nombre: 'Visita', activo: true }}
      permissions={permissions}
      onSaved={mock.saved}
    />,
  );
  const read = await screen.findByRole('checkbox', { name: /Consultar un local autorizado/ });
  expect((read as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole('checkbox', { name: /Editar información del negocio/ })).toBeTruthy();
  expect(screen.queryByText('Editar nombre y zona horaria')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Usar esta base' }));
  expect((read as HTMLInputElement).checked).toBe(true);
  for (const checkbox of screen.getAllByRole('checkbox').filter((item) => item !== read))
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  expect(mock.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(mock.api).toHaveBeenCalledWith('/negocios/A/roles/visita/permisos', {
    method: 'PUT',
    body: JSON.stringify({ permisos: ['locales.ver'] }),
  });
});

it('las bases solo aparecen si todas sus acciones existen y no se ofrecen a quien solo consulta roles', async () => {
  const view = render(
    <RoleEditor
      role={{ id: 'r', nombre: 'Vendedor', activo: true }}
      permissions={permissions.filter((item) => item.codigo === 'locales.ver')}
      onSaved={mock.saved}
    />,
  );
  await screen.findByLabelText('Base de permisos sugerida');
  expect(screen.queryByRole('option', { name: 'Gestión de locales' })).toBeNull();
  view.unmount();
  mock.owner = false;
  render(
    <RoleEditor
      role={{ id: 'r', nombre: 'Vendedor', activo: true }}
      permissions={permissions}
      onSaved={mock.saved}
    />,
  );
  await screen.findByRole('checkbox', { name: /Consultar un local autorizado/ });
  expect(screen.queryByLabelText('Base de permisos sugerida')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Guardar permisos' })).toBeNull();
});
