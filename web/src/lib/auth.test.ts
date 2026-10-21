import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mock }) }));
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  history.replaceState(null, '', '/auth/callback');
  mock.getUser.mockResolvedValue({
    data: { user: { id: 'identity', email_confirmed_at: 'confirmed' } },
  });
  mock.setSession.mockResolvedValue({ error: null });
  mock.exchangeCodeForSession.mockResolvedValue({ error: null });
});
it('consume invitación una sola vez, borra secretos y exige establecer contraseña', async () => {
  history.replaceState(
    null,
    '',
    '/auth/callback#access_token=private&refresh_token=refresh&type=invite',
  );
  const { consumeCallback } = await import('./auth');
  expect(await consumeCallback()).toBe('password');
  await consumeCallback();
  expect(mock.setSession).toHaveBeenCalledTimes(1);
  expect(location.hash).toBe('');
  expect(sessionStorage.getItem('vexor:password-pending')).toBe('identity');
});
it('el acceso por enlace de una identidad existente conserva la contraseña', async () => {
  history.replaceState(
    null,
    '',
    '/auth/callback#access_token=private&refresh_token=refresh&type=magiclink',
  );
  const { consumeCallback } = await import('./auth');
  expect(await consumeCallback()).toBe('continue');
  expect(sessionStorage.getItem('vexor:password-pending')).toBeNull();
});
it('acepta un código PKCE y lo elimina de la dirección', async () => {
  history.replaceState(null, '', '/auth/callback?code=private');
  const { consumeCallback } = await import('./auth');
  await consumeCallback();
  expect(location.search).toBe('');
  expect(mock.exchangeCodeForSession).toHaveBeenCalledWith('private');
});
it('un enlace vencido nunca reutiliza la sesión previamente abierta', async () => {
  history.replaceState(null, '', '/auth/callback#error=access_denied&error_description=private');
  const { consumeCallback } = await import('./auth');
  await expect(consumeCallback()).rejects.toThrow('venció');
  expect(location.hash).toBe('');
  expect(mock.setSession).not.toHaveBeenCalled();
});
it('rechaza un callback incompleto aunque ya exista una sesión', async () => {
  const { consumeCallback } = await import('./auth');
  await expect(consumeCallback()).rejects.toThrow('incompleto');
});
