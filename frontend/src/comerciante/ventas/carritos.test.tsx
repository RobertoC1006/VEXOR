import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../compartido/api/api', async (original) => ({
  ...(await original<object>()),
  api: mock.api,
}));
import { ApiError } from '../../compartido/api/api';
import { useHeldCarts } from './use-held-carts';
import { WaitingCarts } from './componentes/waiting-carts';
import type { CartLine, PosProduct, WaitingCart } from './types';
const product: PosProduct = {
  id: 'p',
  nombre: 'Cuaderno',
  modelo_nombre: 'Cuaderno',
  producto_padre_id: null,
  codigo: null,
  precio: '18.00',
  foto_id: 'p',
  foto_version: 0,
  caracteristicas: [],
  stock: 20,
  estado: 'confirmado',
  minimo: 5,
  presentaciones: [],
};
const line: CartLine = { key: 'p:unidad', product, quantity: 2 };
const saved = new Map<string, WaitingCart>();
let loseReply = false;
function Harness({ initial = true }: { initial?: boolean }) {
  const [lines, setLines] = useState<CartLine[]>(initial ? [line] : []),
    [discount, setDiscount] = useState(0),
    [message, setMessage] = useState('');
  const held = useHeldCarts({
    base: '/negocios/N',
    local: 'L',
    lines,
    discount,
    setLines,
    setDiscount,
    setMessage,
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      <label>
        Referencia
        <input value={held.name} onChange={(e) => held.setName(e.target.value)} />
      </label>
      <p data-testid="current">{lines.reduce((n, l) => n + l.quantity, 0)} unidades</p>
      <p>{message}</p>
      {held.error && <p role="alert">{held.error}</p>}
      <button disabled={held.busy || !lines.length} onClick={() => void held.hold()}>
        Guardar en espera
      </button>
      <button
        onClick={() => {
          setLines([line]);
        }}
      >
        Agregar compra
      </button>
      <button onClick={() => setOpen(true)}>Ver carritos</button>
      {open && (
        <WaitingCarts held={held} hasCurrent={lines.length > 0} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
beforeEach(() => {
  saved.clear();
  loseReply = false;
  mock.api.mockReset();
  mock.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (options?.method === 'PUT') {
      const d = JSON.parse(String(options.body)),
        id = path.split('/').at(-1)!;
      const cart: WaitingCart = {
        id,
        version: d.version + 1,
        local_id: d.local_id,
        nombre: d.nombre ?? `Carrito ${id.slice(0, 6)}`,
        contenido: { lineas: d.lineas, descuento: d.descuento },
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
        resumen: [
          {
            producto_id: 'p',
            nombre: 'Cuaderno',
            modelo_nombre: 'Cuaderno',
            presentacion: 'Unidad',
          },
        ],
      };
      saved.set(id, cart);
      if (loseReply) {
        loseReply = false;
        throw new ApiError(0, 'Respuesta perdida');
      }
      return cart;
    }
    if (path.includes('/catalogo?')) return { items: [product] };
    if (path.includes('/carritos?'))
      return { items: [...saved.values()], total: saved.size, demanda: [], has_more: false };
    if (path.includes('/carritos/')) return saved.get(path.split('/').at(-1)!);
    throw new Error('Ruta no esperada');
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('guarda varios carritos, inicia otra venta y los retoma después de recargar la pantalla', async () => {
  const view = render(<Harness />);
  fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Compra Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en espera' }));
  await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('0 unidades'));
  fireEvent.click(screen.getByRole('button', { name: 'Agregar compra' }));
  fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Compra Rosa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en espera' }));
  await waitFor(() => expect(saved.size).toBe(2));
  view.unmount();
  render(<Harness initial={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver carritos' }));
  await screen.findByText('Compra Ana');
  expect(screen.getByText('Compra Rosa')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retomar Compra Ana' }));
  await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('2 unidades'));
  expect(screen.getByLabelText('Referencia').getAttribute('value')).toBe('Compra Ana');
});
it('conserva la compra actual antes de retomar otra y no sobrescribe sus productos', async () => {
  const view = render(<Harness />);
  fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Anterior' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en espera' }));
  await waitFor(() => expect(saved.size).toBe(1));
  view.unmount();
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Actual' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver carritos' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Retomar Anterior' }));
  await waitFor(() => expect(saved.size).toBe(2));
  expect([...saved.values()].some((c) => c.nombre === 'Actual')).toBe(true);
  await waitFor(() =>
    expect(screen.getByLabelText('Referencia').getAttribute('value')).toBe('Anterior'),
  );
});
it('reintenta guardar con el mismo identificador si se pierde la respuesta', async () => {
  loseReply = true;
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en espera' }));
  await screen.findByRole('alert');
  expect(screen.getByTestId('current').textContent).toBe('2 unidades');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en espera' }));
  await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('0 unidades'));
  const puts = mock.api.mock.calls.filter((c) => c[1]?.method === 'PUT');
  expect(puts).toHaveLength(2);
  expect(puts[0][0]).toBe(puts[1][0]);
  expect(saved.size).toBe(1);
});
