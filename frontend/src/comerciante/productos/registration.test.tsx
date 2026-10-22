import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ api: vi.fn(), listAll: vi.fn(), saved: vi.fn() }));
vi.mock('../../compartido/api/api', () => ({ api: mock.api, listAll: mock.listAll }));
vi.mock('../negocio/context', () => ({
  useBusiness: () => ({ base: '/negocios/A', can: () => true }),
}));
import { ProductForm } from './componentes/product-form';
import { CategoriesManager, CategoriesProvider, type Category } from '../categorias/categories';
import type { Product } from './types';

const categories: Category[] = [
  { id: 'ropa', negocio_id: 'A', nombre: 'Ropa interior', padre_id: null, version: 1 },
  { id: 'mujer', negocio_id: 'A', nombre: 'Mujer', padre_id: 'ropa', version: 1 },
  { id: 'brasieres', negocio_id: 'A', nombre: 'Brasieres', padre_id: 'mujer', version: 1 },
];
const model: Product = {
  id: 'modelo',
  negocio_id: 'A',
  nombre: 'Brasier RAE',
  nivel_registro: 'avanzado',
  alias: null,
  descripcion: 'Con aro',
  codigo: 'MODELO-1',
  precio: null,
  costo: null,
  activo: true,
  version: 4,
  categoria_id: null,
  ejes_variantes: [],
  producto_padre_id: null,
  caracteristicas: [
    { nombre: 'Marca', valor: 'RAE' },
    { nombre: 'Talla', valor: '48' },
    { nombre: 'Color', valor: 'Rojo' },
  ],
};
const oldCombination: Product = {
  ...model,
  id: 'anterior',
  nombre: '12 B rojo',
  producto_padre_id: model.id,
  codigo: '00124',
  nivel_registro: 'simple',
  version: 2,
  caracteristicas: [
    { nombre: 'Talla', valor: '12' },
    { nombre: 'Copa', valor: 'B' },
    { nombre: 'Color', valor: 'Rojo' },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.api.mockResolvedValue({});
  mock.saved.mockResolvedValue(undefined);
  mock.listAll.mockImplementation(async (url: string) =>
    url.endsWith('/categorias') ? categories : [oldCombination],
  );
});
afterEach(cleanup);
function create(example = true, product?: Product) {
  render(
    <CategoriesProvider>
      <CategoriesManager />
      <ProductForm example={example} product={product} onSaved={mock.saved} onCancel={() => {}} />
    </CategoriesProvider>,
  );
}
it('guarda el modelo y dos combinaciones juntas, con categoría y sin crear existencias', async () => {
  create();
  await screen.findByRole('option', { name: 'Ropa interior → Mujer → Brasieres' });
  fireEvent.change(screen.getByLabelText('Categoría (opcional)'), {
    target: { value: 'brasieres' },
  });
  expect(
    screen.getAllByLabelText(/^Característica \d$/).map((el) => (el as HTMLInputElement).value),
  ).toEqual(['Marca', 'Modelo']);
  fireEvent.click(screen.getByRole('button', { name: 'Añadir combinación' }));
  const first = within(screen.getByRole('group', { name: 'Combinación 1' }));
  fireEvent.change(first.getByLabelText('Talla'), { target: { value: '48' } });
  fireEvent.change(first.getByLabelText('Color'), { target: { value: 'Rojo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Añadir combinación' }));
  const second = within(screen.getByRole('group', { name: 'Combinación 2' }));
  fireEvent.change(second.getByLabelText('Talla'), { target: { value: '46' } });
  fireEvent.change(second.getByLabelText('Color'), { target: { value: 'Negro' } });
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  const body = JSON.parse(mock.api.mock.calls[0][1].body);
  expect(mock.api.mock.calls[0][0]).toBe('/negocios/A/productos/registro');
  expect(body.producto.categoria_id).toBe('brasieres');
  expect(body.producto.caracteristicas.map((a: any) => a.nombre)).toEqual(['Marca', 'Modelo']);
  expect(body.combinaciones.map((c: any) => c.nombre)).toEqual(['48 / Rojo', '46 / Negro']);
  expect(JSON.stringify(body)).not.toContain('cantidad');
});
it('mover talla y color a una combinación requiere pulsar la acción y conserva la combinación anterior', async () => {
  create(false, model);
  await screen.findByLabelText('Nombre del producto o modelo');
  expect(
    (
      within(screen.getByRole('group', { name: 'Combinación 1' })).getByLabelText(
        'Talla',
      ) as HTMLInputElement
    ).value,
  ).toBe('12');
  expect(screen.getAllByRole('button', { name: 'Usar en una combinación' })).toHaveLength(3);
  fireEvent.click(screen.getAllByRole('button', { name: 'Usar en una combinación' })[1]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Usar en una combinación' })[1]);
  const next = within(screen.getByRole('group', { name: 'Combinación 2' }));
  expect((next.getByLabelText('Talla') as HTMLInputElement).value).toBe('48');
  expect((next.getByLabelText('Color') as HTMLInputElement).value).toBe('Rojo');
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  const body = JSON.parse(mock.api.mock.calls[0][1].body);
  expect(body.version).toBe(4);
  expect(body.producto.caracteristicas).toEqual([{ nombre: 'Marca', valor: 'RAE' }]);
  expect(body.combinaciones).toHaveLength(1);
  expect(body.combinaciones[0].id).toBeUndefined();
  expect(body.combinaciones[0].caracteristicas).toEqual([
    { nombre: 'Talla', valor: '48' },
    { nombre: 'Color', valor: 'Rojo' },
  ]);
});
it('no reenvía ni reemplaza combinaciones existentes que no se editaron', async () => {
  create(false, model);
  await screen.findByLabelText('Nombre del producto o modelo');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body).combinaciones).toEqual([]);
});
it('un conflicto conserva los datos escritos y no anuncia el guardado', async () => {
  mock.api.mockRejectedValue(new Error('La combinación ya tiene un conteo'));
  create();
  fireEvent.click(screen.getByRole('button', { name: 'Añadir combinación' }));
  const first = within(screen.getByRole('group', { name: 'Combinación 1' }));
  fireEvent.change(first.getByLabelText('Talla'), { target: { value: '48' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await screen.findByText('La combinación ya tiene un conteo');
  expect((first.getByLabelText('Talla') as HTMLInputElement).value).toBe('48');
  expect(mock.saved).not.toHaveBeenCalled();
});
it('crear una categoría no descarta la ficha que se estaba preparando', async () => {
  create();
  await screen.findByRole('option', { name: 'Ropa interior → Mujer → Brasieres' });
  fireEvent.change(screen.getByLabelText('Nombre del producto o modelo'), {
    target: { value: 'Modelo en preparación' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Administrar categorías' }));
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Niña' } });
  fireEvent.change(screen.getByLabelText('Dentro de'), { target: { value: 'ropa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar categoría' }));
  await screen.findByText('Categoría guardada. Ya puedes seleccionarla en el producto.');
  expect(mock.api).toHaveBeenCalledWith(
    '/negocios/A/categorias',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ nombre: 'Niña', padre_id: 'ropa' }),
    }),
  );
  expect((screen.getByLabelText('Nombre del producto o modelo') as HTMLInputElement).value).toBe(
    'Modelo en preparación',
  );
  expect(mock.saved).not.toHaveBeenCalled();
});
