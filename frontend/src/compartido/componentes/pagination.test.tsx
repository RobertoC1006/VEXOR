import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClientPager, useClientPage } from './pagination';
afterEach(cleanup);
function List({ count }: { count: number }) {
  const page = useClientPage(Array.from({ length: count }, (_, i) => `Elemento ${i + 1}`));
  return (
    <>
      <ClientPager page={page} />
      <ul>
        {page.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}
it('muestra cinco, permite diez y vuelve a la primera página al cambiar el tamaño', () => {
  render(<List count={16} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Elemento 6')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Elementos por página'), { target: { value: '10' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
  expect(screen.getByText('Elemento 1')).toBeTruthy();
});
it('evita una página vacía si desaparecen los últimos elementos', () => {
  const view = render(<List count={6} />);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  view.rerender(<List count={4} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
});
