import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ api: vi.fn(), reload: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../compartido/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../compartido/api/api')>()),
  api: mock.api,
}));
vi.mock('../../../compartido/acceso/workspace', () => ({
  useWorkspace: () => ({ data: { me: { auth_user_id: 'local-admin' } } }),
}));
vi.mock('../../estado/platform', () => ({ usePlatform: () => ({ reload: mock.reload }) }));
import { NewBusinessInvitationPage } from './invitation-form';
import { ApiError } from '../../../compartido/api/api';
beforeEach(() => sessionStorage.clear());
afterEach(cleanup);
function page() {
  return render(
    <MemoryRouter>
      <NewBusinessInvitationPage />
    </MemoryRouter>,
  );
}
async function fill() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nombre del negocio'), 'Mercado Demo');
  await user.type(screen.getByLabelText('Nombre del propietario'), 'Persona Demo');
  await user.type(screen.getByLabelText('Correo del propietario'), 'demo@example.test');
  await user.click(screen.getByText('Revisar invitación'));
  return user;
}
it('revisa destinatario y negocio antes de permitir el envío', async () => {
  page();
  await fill();
  expect(mock.api).not.toHaveBeenCalled();
  expect(screen.getByText('demo@example.test')).toBeTruthy();
  expect(screen.getByText('Confirmar y enviar invitación')).toBeTruthy();
});
it('reutiliza la solicitud tras error incierto y recarga, evitando duplicar el alta', async () => {
  mock.api.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));
  const first = page(),
    user = await fill();
  await user.click(screen.getByText('Confirmar y enviar invitación'));
  await screen.findByText('Sin conexión');
  const original = mock.api.mock.calls[0][1];
  first.unmount();
  mock.api.mockResolvedValueOnce({
    negocio_nombre: 'Mercado Demo',
    email: 'demo@example.test',
    estado_envio: 'error',
  });
  page();
  await user.click(screen.getByText('Reintentar la misma solicitud'));
  await screen.findByText('La invitación quedó guardada.');
  expect(mock.api.mock.calls[1][1]).toEqual(original);
  expect(screen.getByText('Revisa el envío del correo.')).toBeTruthy();
  expect(sessionStorage.getItem('vexor:platform-invitation:local-admin')).toBeNull();
});
