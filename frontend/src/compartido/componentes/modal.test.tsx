import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
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
  const dialog = screen.getByRole('dialog');
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 500,
    top: 100,
    bottom: 500,
  } as DOMRect);
  fireEvent(dialog, new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20 }));
  fireEvent.click(dialog, { clientX: 20, clientY: 20 });
  expect(screen.getByRole('dialog')).toBe(dialog);
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

it('cierra al tocar fuera, conserva el espacio interior y evita cerrar al terminar un arrastre', () => {
  const close = vi.fn();
  render(
    <Modal label="Detalle" onClose={close}>
      <p>Contenido</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog');
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 500,
    top: 100,
    bottom: 500,
  } as DOMRect);
  const gesture = (start: number, end: number) => {
    fireEvent(
      dialog,
      new MouseEvent('pointerdown', { bubbles: true, clientX: start, clientY: 150 }),
    );
    fireEvent.click(dialog, { clientX: end, clientY: 150 });
  };
  gesture(150, 150);
  expect(close).not.toHaveBeenCalled();
  gesture(150, 20);
  expect(close).not.toHaveBeenCalled();
  gesture(20, 150);
  expect(close).not.toHaveBeenCalled();
  gesture(20, 20);
  expect(close).toHaveBeenCalledOnce();
});

it('el cierre exterior de un modal anidado no cierra también el anterior', () => {
  const parent = vi.fn(),
    child = vi.fn();
  render(
    <Modal label="Producto" onClose={parent}>
      <Modal label="Elegir local" onClose={child}>
        Locales
      </Modal>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Elegir local' });
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 500,
    top: 100,
    bottom: 500,
  } as DOMRect);
  fireEvent(dialog, new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 150 }));
  fireEvent.click(dialog, { clientX: 20, clientY: 150 });
  expect(child).toHaveBeenCalledOnce();
  expect(parent).not.toHaveBeenCalled();
});
