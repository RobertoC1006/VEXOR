import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mock = vi.hoisted(() => ({ api: vi.fn(), listAll: vi.fn() }));
vi.mock('../compartido/api/api', () => ({ api: mock.api, listAll: mock.listAll }));
vi.mock('../compartido/acceso/workspace', () => ({
  useWorkspace: () => ({ data: { me: { perfil: { nombre: 'María QA' } } } }),
}));
vi.mock('./negocio/context', () => ({
  useBusiness: () => ({
    base: '/negocios/A',
    business: { nombre: 'Lencería QA', zona_horaria: 'America/Lima' },
    access: { es_propietario: true },
    can: () => true,
  }),
}));
import { DashboardPage } from './inicio/paginas/dashboard-page';
import { InventoryPage } from './inventario/paginas/inventory-page';
import { inventoryLink } from './inventario/navigation';
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mock.listAll.mockResolvedValue([
    { id: 'otro', nombre: 'Almacén', activo: true },
    { id: 'local', nombre: 'Puesto piloto', activo: true },
  ]);
});
const item = {
  id: 'variante-12',
  nombre: 'XL negro',
  nombre_completo: 'Bóxer QA · XL negro',
  activo: true,
  cantidad: null,
  referencia: null,
  estado: 'pendiente',
  version: 0,
};
const inventory = {
  items: [item],
  has_more: false,
  permisos: { contar: true, confirmar: true, ver: true },
  producto_filtrado: { id: 'variante-12', nombre: 'Bóxer QA · XL negro', nivel_registro: 'simple' },
};
const summary = {
  catalogo: { productos: 2, combinaciones: 12 },
  locales: [
    {
      id: 'local',
      nombre: 'Puesto piloto',
      habilitado_venta: true,
      total: 13,
      confirmados: 1,
      unidades: 3,
      alertas: 1,
      sin_minimo: 0,
    },
  ],
  alertas: [
    {
      id: 'variante-12',
      nombre: 'XL negro',
      modelo_nombre: 'Bóxer QA',
      local_id: 'local',
      local_nombre: 'Puesto piloto',
      cantidad: 3,
      minimo: 5,
      foto_version: 0,
    },
  ],
  actividad: [],
};
it('conserva producto y local por identificador al navegar al conteo', () => {
  expect(inventoryLink('/negocios/A', { productId: 'v', localId: 'l', count: true })).toBe(
    '/negocios/A/inventario?producto=v&local=l&contar=1',
  );
});
it('abre la combinación exacta y no el primer producto del inventario', async () => {
  mock.api.mockResolvedValue(inventory);
  render(
    <MemoryRouter
      initialEntries={['/negocios/A/inventario?producto=variante-12&local=local&contar=1']}
    >
      <InventoryPage />
    </MemoryRouter>,
  );
  await screen.findByRole('dialog', { name: 'Conteo de Bóxer QA · XL negro' });
  expect(
    mock.api.mock.calls.some(
      ([url]) =>
        url.includes('/locales/local/inventario?') && url.includes('producto_id=variante-12'),
    ),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar Conteo de Bóxer QA · XL negro' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('heading', { name: 'Bóxer QA · XL negro' })).toBeTruthy();
});
it('un modelo con varias combinaciones permite elegir sin abrir un conteo incorrecto', async () => {
  mock.api.mockResolvedValue({
    ...inventory,
    items: [item, { ...item, id: 'otra', nombre: 'M rojo' }],
    producto_filtrado: { id: 'modelo', nombre: 'Bóxer QA' },
  });
  render(
    <MemoryRouter initialEntries={['/negocios/A/inventario?producto=modelo&local=local&contar=1']}>
      <InventoryPage />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: /Contar\s*M rojo/ });
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('no cambia silenciosamente a otro local si el enlace indica uno no accesible', async () => {
  render(
    <MemoryRouter
      initialEntries={['/negocios/A/inventario?producto=v&local=no-disponible&contar=1']}
    >
      <InventoryPage />
    </MemoryRouter>,
  );
  await screen.findByText(/El local indicado no está disponible/);
  expect(mock.api).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('el dashboard muestra inventario real y enlaza alertas a su producto y local', async () => {
  mock.api.mockResolvedValue(summary);
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
  await screen.findByText('¡Hola, María!');
  await screen.findByText('Productos activos');
  const metric = screen.getByText('Unidades confirmadas').closest('a')!;
  expect(within(metric).getByText('3')).toBeTruthy();
  expect(
    screen
      .getByRole('meter', { name: 'Conteos confirmados en Puesto piloto' })
      .getAttribute('aria-valuenow'),
  ).toBe('8');
  expect(screen.getByRole('link', { name: /Bóxer QA · XL negro/ }).getAttribute('href')).toBe(
    '/negocios/A/inventario?producto=variante-12&local=local',
  );
  expect(screen.queryByText('S/ 2,850')).toBeNull();
});
it('el dashboard no presenta ceros de inventario cuando faltan permisos', async () => {
  mock.api.mockResolvedValue({ catalogo: null, locales: [], alertas: [], actividad: [] });
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
  await screen.findByText(/Tu cuenta no tiene acceso al catálogo/);
  expect(screen.queryByText('Unidades confirmadas')).toBeNull();
});
