import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MoneyField } from './money-field';

afterEach(cleanup);
function Amount({ initial = '0' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <MoneyField
      id="amount"
      label="Monto"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

it('reemplaza el cero inicial al escribir o pegar un importe', () => {
  render(<Amount />);
  const input = screen.getByLabelText('Monto') as HTMLInputElement;
  fireEvent.focus(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, 1]);
  fireEvent.change(input, { target: { value: '020' } });
  expect(input.value).toBe('20');
  fireEvent.change(input, { target: { value: '000125,50' } });
  expect(input.value).toBe('125,50');
  fireEvent.change(input, { target: { value: '' } });
  expect(input.value).toBe('');
});
it('selecciona un cero con decimales para sobrescribirlo y conserva importes menores a un sol', () => {
  render(<Amount initial="0.00" />);
  const input = screen.getByLabelText('Monto') as HTMLInputElement;
  fireEvent.click(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4]);
  fireEvent.change(input, { target: { value: '0,' } });
  expect(input.value).toBe('0,');
  fireEvent.change(input, { target: { value: '0,50' } });
  expect(input.value).toBe('0,50');
  fireEvent.change(input, { target: { value: '0.05' } });
  expect(input.value).toBe('0.05');
});
it('no selecciona todo al editar un importe distinto de cero', () => {
  render(<Amount initial="24.50" />);
  const input = screen.getByLabelText('Monto') as HTMLInputElement;
  input.setSelectionRange(1, 1);
  fireEvent.focus(input);
  fireEvent.click(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([1, 1]);
});
