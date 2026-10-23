import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mock = vi.hoisted(() => ({ api: vi.fn(), saved: vi.fn() }));
vi.mock('../compartido/api/api', () => ({ api: mock.api }));
vi.mock('./negocio/context', () => ({ useBusiness: () => ({ base: '/negocios/A' }) }));
import { StockOperationForm } from './inventario/componentes/stock-operation-form';
import { StockMatrix } from './inventario/componentes/stock-matrix';
import { StockDetail } from './inventario/componentes/stock-detail';
import type { Product } from './productos/types';
const product = {
  id: 'p',
  nombre: 'Brasier',
  activo: true,
  nivel_registro: 'simple',
  caracteristicas: [],
  ejes_variantes: [],
} as unknown as Product;
const local = {
  id: 'l',
  nombre: 'Puesto',
  habilitado_venta: true,
  ver: true,
  contar: true,
  confirmar: true,
  transferir: true,
  recibir: true,
  ajustar: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.api.mockResolvedValue({});
  mock.saved.mockResolvedValue(undefined);
});
afterEach(cleanup);
it('revisa una recepción parcial y conserva una unidad en tránsito', async () => {
  render(
    <StockOperationForm
      locals={[local]}
      onSaved={mock.saved}
      operation={{
        tipo: 'recepcion',
        local,
        movement: {
          id: 't',
          tipo: 'salida',
          producto_id: 'p',
          nombre: 'Brasier',
          cantidad: 8,
          recibidas: 0,
          local_id: 'otro',
          destino_id: 'l',
          motivo: 'Enviar',
          creado_en: '2026-10-23',
          actor_id: 'a',
        },
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Unidades recibidas'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Nota de recepción o motivo de la diferencia'), {
    target: { value: 'Una unidad pendiente' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar recepción' }));
  expect(screen.getByText(/Quedarán 1 en tránsito/)).toBeTruthy();
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(mock.api.mock.calls[0][0]).toBe('/negocios/A/locales/l/recepciones');
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    traslado_id: 't',
    cantidad: 7,
    motivo: 'Una unidad pendiente',
  });
});
it('un ajuste físico registra la diferencia y el saldo revisado', async () => {
  render(
    <StockOperationForm
      locals={[local]}
      onSaved={mock.saved}
      operation={{ tipo: 'ajuste', local, product, stock: 10 }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Cantidad física actual'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Merma' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar ajuste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar ajuste' }));
  await waitFor(() => expect(mock.saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    cantidad: -1,
    saldo_esperado: 10,
    motivo: 'Merma',
  });
});
it('la matriz distingue cero confirmado, pendiente y selección de combinación', () => {
  const selected = vi.fn();
  const products = [
    {
      ...product,
      id: 'a',
      caracteristicas: [
        { nombre: 'Talla', valor: '34' },
        { nombre: 'Color', valor: 'Rojo' },
      ],
    },
    {
      ...product,
      id: 'b',
      caracteristicas: [
        { nombre: 'Talla', valor: '36' },
        { nombre: 'Color', valor: 'Rojo' },
      ],
    },
  ];
  render(
    <StockMatrix
      axes={['Talla', 'Color']}
      products={products}
      stocks={[{ local_id: 'l', producto_id: 'a', cantidad: 0, estado: 'confirmado', minimo: 5 }]}
      localId="l"
      selected=""
      onSelect={selected}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Color Rojo, Talla 34: 0 unidades' }));
  expect(selected).toHaveBeenCalledWith('a');
  expect(screen.getByRole('button', { name: 'Color Rojo, Talla 36: por contar' })).toBeTruthy();
});
it('el detalle usa solo los locales permitidos y conserva conteos pendientes', async () => {
  mock.api.mockResolvedValue({
    producto: product,
    seleccionado: 'p',
    locales: [local],
    combinaciones: [product],
    existencias: [],
    transitos: [{ producto_id: 'p', cantidad: 1 }],
  });
  render(
    <MemoryRouter>
      <StockDetail productId="p" localId="l" onClose={() => {}} onChanged={mock.saved} />
    </MemoryRouter>,
  );
  const modal = await screen.findByRole('dialog', { name: 'Inventario por puesto / almacén' });
  await within(modal).findByText('Conteo pendiente');
  expect(within(modal).getByText('1 en tránsito')).toBeTruthy();
  expect(
    within(modal).getByRole('button', { name: 'Transferir stock' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(
    within(modal).getByRole('link', { name: 'Ir a contar este producto' }).getAttribute('href'),
  ).toBe('/negocios/A/inventario?producto=p&local=l&contar=1');
});
