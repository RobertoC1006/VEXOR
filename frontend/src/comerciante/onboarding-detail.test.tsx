import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StockGauge, stockCondition } from './inventario/componentes/stock-gauge';
import { ProductDetail } from './productos/componentes/product-detail';
import { ChoicePicker } from '../compartido/componentes/choice-picker';
vi.mock('./negocio/context', () => ({
  useBusiness: () => ({ base: '/negocios/A', can: () => true }),
}));
vi.mock('../compartido/api/api', () => ({
  api: vi.fn().mockResolvedValue({ items: [], has_more: false }),
}));
afterEach(cleanup);
it('distingue conteo pendiente, mínimo sin configurar y existencias en el límite', () => {
  expect(stockCondition(null, 4)).toBe('Pendiente de contar');
  expect(stockCondition(0, null)).toBe('Sin mínimo configurado');
  expect(stockCondition(0, 4)).toBe('Stock bajo');
  expect(stockCondition(4, 4)).toBe('En el mínimo');
  expect(stockCondition(5, 4)).toBe('Stock suficiente');
  render(<StockGauge quantity={0} minimum={4} />);
  expect(screen.getByText('Stock bajo')).toBeTruthy();
  expect(screen.getByText('Mínimo: 4')).toBeTruthy();
});
it('un total suficiente no oculta combinaciones con stock bajo', () => {
  render(<StockGauge quantity={100} minimum={10} lowCount={1} />);
  expect(screen.getByText('1 combinación en alerta')).toBeTruthy();
});
it('abre opciones en tarjetas con búsqueda y conserva la selección', () => {
  const choose = vi.fn();
  render(
    <ChoicePicker
      label="Stock en"
      value="a"
      options={[
        { id: 'a', title: 'Puesto 1', description: 'Puesto de venta' },
        { id: 'b', title: 'Almacén', description: 'Almacén' },
      ]}
      onChange={choose}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Stock en' }));
  fireEvent.change(screen.getByLabelText('Buscar opción'), { target: { value: 'Almacén' } });
  fireEvent.click(screen.getByRole('button', { name: 'Almacén' }));
  expect(choose).toHaveBeenCalledWith('b');
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('consulta primero el detalle y abre combinaciones sin entrar al editor', async () => {
  const edit = vi.fn();
  const product = {
    id: 'm',
    nombre: 'Brasier RAE',
    activo: true,
    nivel_registro: 'avanzado',
    caracteristicas: [{ nombre: 'Marca', valor: 'RAE' }],
    combinaciones_total: 30,
    codigo: null,
    descripcion: 'Con aro',
    precio: null,
    costo: null,
    stock: { cantidad: null, minimo: null, confirmados: 0, total: 30 },
  };
  render(
    <MemoryRouter>
      <ProductDetail product={product as never} onClose={() => {}} onEdit={edit} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('dialog', { name: 'Detalle de Brasier RAE' })).toBeTruthy();
  expect(screen.getByText('RAE')).toBeTruthy();
  expect(edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Combinaciones (30)' }));
  await screen.findByText('Añade la primera combinación');
  expect(edit).not.toHaveBeenCalled();
});
