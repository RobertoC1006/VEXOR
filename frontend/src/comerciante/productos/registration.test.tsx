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
  {
    id: 'brasieres',
    negocio_id: 'A',
    nombre: 'Brasieres',
    padre_id: 'mujer',
    version: 1,
    ejes_variantes: ['Talla', 'Copa', 'Color'],
  },
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
    url.endsWith('/categorias') ? categories : url.endsWith('/variantes') ? [oldCombination] : [],
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
it('conserva características y combinaciones previas sin ofrecer un traslado ambiguo', async () => {
  create(false, model);
  await screen.findByLabelText('Nombre del producto o modelo');
  expect(screen.queryByRole('button', { name: 'Usar en una combinación' })).toBeNull();
  expect(
    (
      within(screen.getByRole('group', { name: 'Combinación 1' })).getByLabelText(
        'Talla',
      ) as HTMLInputElement
    ).value,
  ).toBe('12');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  const body = JSON.parse(mock.api.mock.calls[0][1].body);
  expect(body.producto.caracteristicas).toEqual(model.caracteristicas);
  expect(body.combinaciones).toEqual([]);
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
  fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Niña' } });
  fireEvent.click(screen.getByRole('button', { name: 'Elegir categoría superior' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Elegir categoría superior' })).getByRole('button', {
      name: 'Ropa interior',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Guardar categoría' }));
  await screen.findByText('Categoría guardada. Ya puedes seleccionarla en el producto.');
  expect(mock.api).toHaveBeenCalledWith(
    '/negocios/A/categorias',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ nombre: 'Niña', padre_id: 'ropa', ejes_variantes: [] }),
    }),
  );
  expect((screen.getByLabelText('Nombre del producto o modelo') as HTMLInputElement).value).toBe(
    'Modelo en preparación',
  );
  expect(mock.saved).not.toHaveBeenCalled();
});

it('usa los detalles de la categoría y conserva las filas completadas al cambiar de categoría', async () => {
  create(false);
  await screen.findByRole('option', { name: 'Ropa interior → Mujer → Brasieres' });
  fireEvent.change(screen.getByLabelText('Nivel de registro'), { target: { value: 'avanzado' } });
  fireEvent.change(screen.getByLabelText('Categoría (opcional)'), {
    target: { value: 'brasieres' },
  });
  expect((screen.getByLabelText('Detalle 2') as HTMLInputElement).value).toBe('Copa');
  fireEvent.click(screen.getByRole('button', { name: 'Añadir combinación' }));
  const row = within(screen.getByRole('group', { name: 'Combinación 1' }));
  fireEvent.change(row.getByLabelText('Talla'), { target: { value: '38' } });
  fireEvent.change(screen.getByLabelText('Categoría (opcional)'), { target: { value: 'ropa' } });
  expect((row.getByLabelText('Talla') as HTMLInputElement).value).toBe('38');
});

it('pagina treinta combinaciones y guarda los cambios de distintas páginas sin perder borradores', async () => {
  mock.listAll.mockImplementation(async (url: string) =>
    url.endsWith('/categorias')
      ? categories
      : Array.from({ length: 30 }, (_, i) => ({
          ...oldCombination,
          id: `variante-${i + 1}`,
          nombre: `Combinación ${i + 1}`,
          codigo: `COD-${i + 1}`,
        })),
  );
  create(false, model);
  await screen.findByRole('group', { name: 'Combinación 1' });
  expect(screen.getAllByRole('group', { name: /^Combinación \d+$/ })).toHaveLength(5);
  fireEvent.change(
    within(screen.getByRole('group', { name: 'Combinación 1' })).getByLabelText(
      'Precio de esta combinación (S/, opcional)',
    ),
    { target: { value: '21' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(
    within(screen.getByRole('group', { name: 'Combinación 6' })).getByLabelText(
      'Precio de esta combinación (S/, opcional)',
    ),
    { target: { value: '22' } },
  );
  fireEvent.change(screen.getByLabelText('Elementos por página'), { target: { value: '10' } });
  expect(screen.getAllByRole('group', { name: /^Combinación \d+$/ })).toHaveLength(10);
  expect(
    (
      within(screen.getByRole('group', { name: 'Combinación 1' })).getByLabelText(
        'Precio de esta combinación (S/, opcional)',
      ) as HTMLInputElement
    ).value,
  ).toBe('21');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(
    within(screen.getByRole('group', { name: 'Combinación 30' })).getByLabelText(
      'Costo de esta combinación (S/, opcional)',
    ),
    { target: { value: '9' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo y combinaciones' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  const body = JSON.parse(mock.api.mock.calls[0][1].body);
  expect(body.combinaciones.map((c: any) => c.id)).toEqual([
    'variante-1',
    'variante-6',
    'variante-30',
  ]);
  expect(body.combinaciones.map((c: any) => c.precio)).toEqual(['21', '22', null]);
});

it('presenta tarjetas y un botón de nueva categoría sin mezclar creación y edición en un select', async () => {
  create();
  fireEvent.click(screen.getByRole('button', { name: 'Administrar categorías' }));
  const manager = within(screen.getByRole('dialog', { name: 'Categorías de tu negocio' }));
  await manager.findByRole('button', { name: 'Editar categoría Ropa interior' });
  expect(manager.queryByLabelText('Nombre de la categoría')).toBeNull();
  expect(manager.queryByLabelText('Categoría a editar')).toBeNull();
  fireEvent.click(manager.getByRole('button', { name: 'Editar categoría Ropa interior' }));
  expect((manager.getByLabelText('Nombre de la categoría') as HTMLInputElement).value).toBe(
    'Ropa interior',
  );
  fireEvent.click(manager.getByRole('button', { name: 'Elegir categoría superior' }));
  const picker = within(screen.getByRole('dialog', { name: 'Elegir categoría superior' }));
  expect(picker.getByRole('button', { name: 'Categoría principal' })).toBeTruthy();
  expect(picker.queryByRole('button', { name: 'Ropa interior → Mujer' })).toBeNull();
  expect(picker.queryByRole('button', { name: 'Ropa interior → Mujer → Brasieres' })).toBeNull();
});
