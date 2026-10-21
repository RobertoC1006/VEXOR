import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  change: (_event: string, _session: unknown) => {},
}));
vi.mock('../lib/auth', () => ({ auth: mock }));
import { SessionProvider, useSession } from './session';
function Probe() {
  const { session, loading, expired, signOut } = useSession();
  return (
    <>
      <output>{loading ? 'loading' : session ? 'private-content' : 'anonymous'}</output>
      <span>{expired ? 'expired' : 'current'}</span>
      <button onClick={() => void signOut()}>Salir</button>
    </>
  );
}
beforeEach(() => {
  mock.getSession.mockResolvedValue({ data: { session: { user: { id: 'test' } } }, error: null });
  mock.onAuthStateChange.mockImplementation((callback) => {
    mock.change = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mock.signOut.mockImplementation(async () => {
    mock.change('SIGNED_OUT', null);
    return { error: null };
  });
});
afterEach(cleanup);
async function start() {
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  await screen.findByText('private-content');
}
it('retira datos protegidos y muestra sesión vencida ante rechazo de la API', async () => {
  await start();
  act(() => {
    window.dispatchEvent(new Event('vexor:session-expired'));
  });
  expect(screen.queryByText('private-content')).toBeNull();
  expect(screen.getByText('expired')).toBeTruthy();
  await waitFor(() => expect(mock.signOut).toHaveBeenCalledWith({ scope: 'local' }));
});
it('el cierre voluntario elimina contenido sin avisar falsamente un vencimiento', async () => {
  await start();
  fireEvent.click(screen.getByText('Salir'));
  await screen.findByText('anonymous');
  expect(screen.queryByText('expired')).toBeNull();
});
it('la pérdida de sesión desde Auth también retira el contenido privado', async () => {
  await start();
  act(() => {
    mock.change('SIGNED_OUT', null);
  });
  expect(screen.queryByText('private-content')).toBeNull();
  expect(screen.getByText('expired')).toBeTruthy();
});
