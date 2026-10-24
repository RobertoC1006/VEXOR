import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../compartido/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: mock.api,
}));
vi.mock('../negocio/context', () => ({
  useBusiness: () => ({ base: '/negocios/A', access: { miembro_id: 'm' } }),
}));
import { Checkout } from './componentes/checkout';
import { DiscountInput } from './componentes/discount-input';
import { cents, payment, stockIssue, subtotal, suggestedTotals } from './amounts';
import { ApiError } from '../../compartido/api/api';
import { chargeStorageKey } from './charge-recovery';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});
const body = {
  local_id: 'local',
  lineas: [{ producto_id: 'p', cantidad: 3, unidades_esperadas: 1, precio_esperado: '18.00' }],
  descuento: '4.00',
};
it('calcula importes en céntimos y vuelto solo sobre efectivo', () => {
  expect(cents('18.10')).toBe(1810);
  expect(cents('018,50')).toBe(1850);
  expect(cents('NaN')).toBeNull();
  expect(cents('-1')).toBeNull();
  expect(cents('1.001')).toBeNull();
  expect(payment(5000, '25', '15', '20')).toEqual({
    cash: 1000,
    yape: 2500,
    plin: 1500,
    received: 2000,
    remaining: 0,
    change: 1000,
  });
  expect(payment(5000, '55', '0', '0')).toBeNull();
  expect(payment(5000, '50', '0', '10')).toBeNull();
});
it('convierte dejar total en a una única rebaja y respeta el límite', () => {
  const save = vi.fn();
  function Sale() {
    const [discount, setDiscount] = useState(0);
    const [valid, setValid] = useState(true);
    return (
      <>
        <DiscountInput
          subtotal={5400}
          discount={discount}
          limit={500}
          disabled={false}
          onChange={(value) => {
            setDiscount(value);
            save(value);
          }}
          onValidity={setValid}
        />
        <output>Total: {(5400 - discount) / 100}</output>
        <button disabled={!valid}>Cobrar</button>
      </>
    );
  }
  render(<Sale />);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.change(screen.getByLabelText('Dejar total en S/'), { target: { value: '50' } });
  expect(save).toHaveBeenCalledWith(400);
  expect(screen.getByText('Total: 50')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Dejar total en S/'), { target: { value: '40' } });
  expect(screen.getByRole('button', { name: 'Cobrar' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText('Total: 50')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /S.*50[.,]00/ }));
  expect(save).toHaveBeenLastCalledWith(400);
  fireEvent.change(screen.getByLabelText('Dejar total en S/'), { target: { value: '50,50' } });
  expect(save).toHaveBeenLastCalledWith(350);
  expect((screen.getByLabelText('Dejar total en S/') as HTMLInputElement).value).toBe('50,50');
  expect(screen.getByRole('button', { name: 'Cobrar' }).hasAttribute('disabled')).toBe(false);
});
it('impide completar un cobro incompleto y registra pagos mixtos con vuelto', async () => {
  mock.api.mockResolvedValue({ id: 'venta' });
  const success = vi.fn();
  render(<Checkout body={body} total={5000} onClose={() => {}} onSuccess={success} />);
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Pago mixto' }));
  fireEvent.change(screen.getByLabelText('Efectivo (S/)'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Yape (S/)'), { target: { value: '25' } });
  fireEvent.change(screen.getByLabelText('Plin (S/)'), { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar venta' }));
  await waitFor(() => expect(success).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    ...body,
    pagos: { efectivo: '10.00', yape: '25.00', plin: '15.00' },
    efectivo_recibido: '20.00',
  });
});
it('reintenta el mismo cobro tras perder la respuesta, sin generar otra clave', async () => {
  mock.api
    .mockRejectedValueOnce(new ApiError(0, 'Respuesta perdida'))
    .mockResolvedValueOnce({ id: 'venta' });
  render(<Checkout body={body} total={5000} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Importe exacto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar venta' }));
  await screen.findByRole('button', { name: 'Reintentar mismo cobro' });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar mismo cobro' }));
  await waitFor(() => expect(mock.api).toHaveBeenCalledTimes(2));
  expect(mock.api.mock.calls[0][1].body).toBe(mock.api.mock.calls[1][1].body);
});
it('agrega unidades base de distintas presentaciones al comprobar disponibilidad', () => {
  const product = {
    id: 'p',
    modelo_nombre: 'Producto',
    precio: '18.00',
    estado: 'confirmado',
    stock: 13,
  } as any;
  const lines = [
    { key: 'unit', product, quantity: 2 },
    {
      key: 'pack',
      product,
      quantity: 1,
      presentation: { id: 'pr', nombre: 'Docena', unidades: 12, precio: '180' },
    },
  ];
  expect(subtotal(lines)).toBe(21600);
  expect(stockIssue(lines)).toContain('Stock insuficiente');
});
it('recupera el intento de cobro después de recargar y conserva su clave', async () => {
  const pending = {
    ...body,
    operacion_id: 'misma-operacion',
    pagos: { efectivo: '50.00', yape: '0.00', plin: '0.00' },
    efectivo_recibido: '60.00',
  };
  sessionStorage.setItem(chargeStorageKey('m', '/negocios/A'), JSON.stringify(pending));
  mock.api.mockResolvedValue({ id: 'venta-recuperada' });
  render(<Checkout body={body} total={5000} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar mismo cobro' }));
  await waitFor(() => expect(mock.api).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual(pending);
  await waitFor(() =>
    expect(sessionStorage.getItem(chargeStorageKey('m', '/negocios/A'))).toBeNull(),
  );
});

it('sugiere totales cercanos en múltiplos de cinco sin exceder el permiso', () => {
  expect(suggestedTotals(6800, 6800)).toEqual([6500, 6000]);
  expect(suggestedTotals(10500, 10500)).toEqual([10000, 9500]);
  expect(suggestedTotals(5400, 500)).toEqual([5000]);
  expect(suggestedTotals(6800, 200)).toEqual([]);
  expect(suggestedTotals(300, 300)).toEqual([]);
  expect(suggestedTotals(0, 0)).toEqual([]);
});

it('asigna todo a un método único y no solicita efectivo para Yape o Plin', async () => {
  mock.api.mockResolvedValue({ id: 'venta' });
  render(<Checkout body={body} total={5000} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Yape' }));
  expect(screen.queryByLabelText('Efectivo recibido (S/)')).toBeNull();
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Plin' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar venta' }));
  await waitFor(() => expect(mock.api).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body).pagos).toEqual({
    efectivo: '0.00',
    yape: '0.00',
    plin: '50.00',
  });
});
it('bloquea pagos incompletos o exceso electrónico, y calcula el vuelto con efectivo', () => {
  render(<Checkout body={body} total={5000} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pago mixto' }));
  fireEvent.change(screen.getByLabelText('Yape (S/)'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Efectivo (S/)'), { target: { value: '10' } });
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('Plin (S/)'), { target: { value: '25' } });
  expect(screen.getByText(/Yape y Plin superan el total/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('Plin (S/)'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Efectivo (S/)'), { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('Efectivo (S/)'), { target: { value: '20' } });
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(false);
});
it('calcula automáticamente vuelto 6 de recibido 30 para venta 24 y registra efectivo neto 4', async () => {
  mock.api.mockResolvedValue({ id: 'venta-mixta' });
  render(<Checkout body={body} total={2400} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pago mixto' }));
  fireEvent.change(screen.getByLabelText('Efectivo (S/)'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Yape (S/)'), { target: { value: '020' } });
  expect(screen.queryByLabelText('Efectivo recibido (S/)')).toBeNull();
  expect(screen.queryByText('Exceso asignado')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Calcular vuelto' })).toBeNull();
  expect(screen.getByText(/S.*6[.,]00/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cobrar venta' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar venta' }));
  await waitFor(() => expect(mock.api).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({
    pagos: { efectivo: '4.00', yape: '20.00', plin: '0.00' },
    efectivo_recibido: '10.00',
  });
});
it('recupera un pago mixto incierto conservando efectivo recibido y la solicitud original', async () => {
  const pending = {
    ...body,
    operacion_id: 'operacion-mixta',
    pagos: { efectivo: '4.00', yape: '20.00', plin: '0.00' },
    efectivo_recibido: '10.00',
  };
  sessionStorage.setItem(chargeStorageKey('m', '/negocios/A'), JSON.stringify(pending));
  mock.api.mockResolvedValue({ id: 'venta-recuperada' });
  render(<Checkout body={body} total={2400} onClose={() => {}} onSuccess={() => {}} />);
  expect((screen.getByLabelText('Efectivo (S/)') as HTMLInputElement).value).toBe('10.00');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar mismo cobro' }));
  await waitFor(() => expect(mock.api).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual(pending);
});
