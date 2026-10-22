import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ api: vi.fn(), listAll: vi.fn(), saved: vi.fn(), can: vi.fn() }));
vi.mock('../compartido/api/api', () => ({ api: mock.api, listAll: mock.listAll }));
vi.mock('../compartido/escaneo/barcode-scanner', () => ({
  BarcodeScanner: ({
    onRead,
    onClose,
  }: {
    onRead: (code: string) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Cámara de prueba">
      <button type="button" onClick={() => onRead('000123')}>
        Leer código de prueba
      </button>
      <button type="button" onClick={onClose}>
        Cerrar cámara de prueba
      </button>
    </div>
  ),
}));
vi.mock('./negocio/context', () => ({
  useBusiness: () => ({ base: '/negocios/A', can: mock.can }),
}));
import { ProductForm } from './productos/componentes/product-form';
import { CountForm } from './inventario/componentes/count-form';
import { ProductsPage } from './productos/paginas/products-page';
import type { InventoryItem } from './inventario/types';

beforeEach(() => {
  vi.clearAllMocks();
  mock.api.mockResolvedValue({});
  mock.listAll.mockResolvedValue([]);
  mock.saved.mockResolvedValue(undefined);
  mock.can.mockReturnValue(true);
});
afterEach(cleanup);
const item: InventoryItem = {
  id: 'p',
  nombre: 'Cuaderno azul',
  alias: null,
  codigo: null,
  activo: true,
  cantidad: 0,
  estado: 'preparacion',
  version: 3,
  referencia: null,
  confirmado_en: null,
};
const permissions = { ver: true, contar: true, confirmar: true };

it('crea con solo el nombre y conserva los importes desconocidos como null', async () => {
  render(<ProductForm onSaved={mock.saved} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nombre del producto'), {
    target: { value: ' Cuaderno azul ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual({
    nombre: 'Cuaderno azul',
    alias: null,
    codigo: null,
    descripcion: null,
    precio: null,
    costo: null,
    activo: true,
    categoria_id: null,
    nivel_registro: 'simple',
    caracteristicas: [],
  });
});
it('conserva el código con ceros y admite coma decimal sin usar cero para costo vacío', async () => {
  render(<ProductForm onSaved={mock.saved} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Cuaderno' } });
  fireEvent.change(screen.getByLabelText('Código (opcional)'), { target: { value: '000123' } });
  fireEvent.change(screen.getByLabelText('Precio por unidad (S/, opcional)'), {
    target: { value: '018,50' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    codigo: '000123',
    precio: '18.50',
    costo: null,
  });
});
it('permite revisar un cero contado, exige revisión y confirma la versión guardada', async () => {
  render(
    <CountForm
      item={item}
      localId="L"
      permissions={permissions}
      onSaved={mock.saved}
      onCancel={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: 'Confirmar conteo' }).hasAttribute('disabled')).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar conteo' }));
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar conteo' }),
  );
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(mock.api).toHaveBeenCalledWith(
    '/negocios/A/locales/L/inventario/p/confirmar',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ version: 3, revision_fisica: true }),
    }),
  );
});
it('editar la cantidad retira la revisión e impide confirmar sin guardar', () => {
  render(
    <CountForm
      item={item}
      localId="L"
      permissions={permissions}
      onSaved={mock.saved}
      onCancel={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Cantidad de unidades'), { target: { value: '5' } });
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Confirmar conteo' }).hasAttribute('disabled')).toBe(
    true,
  );
  expect(mock.api).not.toHaveBeenCalled();
});
it('un producto pendiente comienza con cantidad vacía y guardar cero solo prepara el conteo', async () => {
  render(
    <CountForm
      item={{ ...item, cantidad: null, estado: 'pendiente', version: 0 }}
      localId="L"
      permissions={permissions}
      onSaved={mock.saved}
      onCancel={() => {}}
    />,
  );
  expect((screen.getByLabelText('Cantidad de unidades') as HTMLInputElement).value).toBe('');
  expect(screen.queryByRole('button', { name: 'Confirmar conteo' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Cantidad de unidades'), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual({
    cantidad: 0,
    referencia: null,
    version: 0,
  });
});
it('conserva el borrador visible si falla la red y no declara el guardado exitoso', async () => {
  mock.api.mockRejectedValue(new Error('No pudimos conectar'));
  render(
    <CountForm
      item={item}
      localId="L"
      permissions={permissions}
      onSaved={mock.saved}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('Cantidad de unidades'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Cantidad de unidades') as HTMLInputElement).value).toBe('8');
  expect(mock.saved).not.toHaveBeenCalled();
});
it('no consulta el catálogo sin permiso', () => {
  mock.can.mockReturnValue(false);
  render(<ProductsPage />);
  expect(screen.getByText('No tienes permiso para consultar productos.')).toBeTruthy();
  expect(mock.api).not.toHaveBeenCalled();
});
it('el nivel intermedio conserva características descriptivas sin crear variantes', async () => {
  render(<ProductForm onSaved={mock.saved} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nivel de registro'), { target: { value: 'intermedio' } });
  fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Cuaderno' } });
  expect((screen.getByLabelText('Característica 1') as HTMLInputElement).value).toBe('Marca');
  expect((screen.getByLabelText('Característica 2') as HTMLInputElement).value).toBe('Modelo');
  expect((screen.getByLabelText('Característica 3') as HTMLInputElement).value).toBe('Talla');
  expect((screen.getByLabelText('Característica 4') as HTMLInputElement).value).toBe('Color');
  fireEvent.change(screen.getByLabelText('Característica 1'), { target: { value: 'Material' } });
  fireEvent.change(screen.getByLabelText('Valor 1'), { target: { value: 'Ejemplo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    nivel_registro: 'intermedio',
    caracteristicas: [{ nombre: 'Material', valor: 'Ejemplo' }],
  });
});
it('prepara una ficha avanzada de lencería sin guardarla automáticamente', () => {
  render(<ProductForm example onSaved={mock.saved} onCancel={() => {}} />);
  expect((screen.getByLabelText('Nivel de registro') as HTMLSelectElement).value).toBe('avanzado');
  expect((screen.getByLabelText('Nombre del producto o modelo') as HTMLInputElement).value).toBe(
    'Sostén modelo de prueba',
  );
  expect(screen.getByText(/El modelo no tiene un conteo adicional/)).toBeTruthy();
  expect(mock.api).not.toHaveBeenCalled();
});
it('escanear busca inmediatamente el código exacto y vuelve a la primera página', async () => {
  mock.api.mockResolvedValue({ items: [], has_more: true });
  render(<ProductsPage />);
  const input = screen.getByLabelText('Buscar por nombre, alias o código');
  fireEvent.change(input, { target: { value: 'texto anterior' } });
  fireEvent.click(screen.getByRole('button', { name: /^Buscar$/ }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/productos?limit=5&offset=0&q=texto+anterior',
      expect.anything(),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/productos?limit=5&offset=5&q=texto+anterior',
      expect.anything(),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Escanear para buscar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leer código de prueba' }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/productos?limit=5&offset=0&codigo=000123',
      expect.anything(),
    ),
  );
  expect((input as HTMLInputElement).value).toBe('000123');
  expect(screen.queryByRole('dialog')).toBeNull();
  const before = mock.api.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Escanear para buscar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leer código de prueba' }));
  await waitFor(() => expect(mock.api.mock.calls.length).toBe(before + 1));
  fireEvent.change(input, { target: { value: 'Cuaderno' } });
  fireEvent.click(screen.getByRole('button', { name: /^Buscar$/ }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/productos?limit=5&offset=0&q=Cuaderno',
      expect.anything(),
    ),
  );
});
it('cerrar el escáner de búsqueda no modifica el texto ni ejecuta una consulta', async () => {
  mock.api.mockResolvedValue({ items: [], has_more: false });
  render(<ProductsPage />);
  await screen.findByText('Todavía no hay productos en esta lista');
  fireEvent.change(screen.getByLabelText('Buscar por nombre, alias o código'), {
    target: { value: 'Mi búsqueda' },
  });
  const before = mock.api.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Escanear para buscar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar cámara de prueba' }));
  expect(mock.api.mock.calls.length).toBe(before);
  expect(
    (screen.getByLabelText('Buscar por nombre, alias o código') as HTMLInputElement).value,
  ).toBe('Mi búsqueda');
});
