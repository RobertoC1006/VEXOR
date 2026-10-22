import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from './modal';
import { useAction } from '../api/use-action';
afterEach(cleanup);
it('bloquea el cierre durante el guardado y devuelve el foco al abrir y cerrar', async () => {
  let finish!: () => void;
  const saving = new Promise<void>((resolve) => {
    finish = resolve;
  });
  function Form() {
    const action = useAction();
    return <button onClick={() => void action.run(() => saving)}>Guardar prueba</button>;
  }
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir prueba</button>
        {open && (
          <Modal label="Prueba" onClose={() => setOpen(false)}>
            <Form />
          </Modal>
        )}
      </>
    );
  }
  render(<Host />);
  const launch = screen.getByRole('button', { name: 'Abrir prueba' });
  launch.focus();
  fireEvent.click(launch);
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }));
  expect(
    (screen.getByRole('button', { name: 'Cerrar Prueba' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  finish();
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Cerrar Prueba' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar Prueba' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(launch);
  expect(document.body.style.overflow).toBe('');
});
