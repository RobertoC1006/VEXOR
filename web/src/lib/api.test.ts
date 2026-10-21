import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('./auth', () => ({ auth: mock }));
import { api, listAll } from './api';
describe('API y aislamiento de sesión', () => {
  beforeEach(() => {
    mock.getSession.mockResolvedValue({
      data: { session: { access_token: 'local-test-token' } },
      error: null,
    });
  });
  it('envía el token al monolito y nunca la selección como autorización', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'business' })));
    await expect(api('/negocios/business')).resolves.toEqual({ id: 'business' });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/negocios/business',
      expect.objectContaining({ headers: { Authorization: 'Bearer local-test-token' } }),
    );
  });
  it('una sesión ausente interrumpe la solicitud y avisa al shell', async () => {
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const event = vi.fn();
    window.addEventListener('vexor:session-expired', event, { once: true });
    const fetcher = vi.spyOn(globalThis, 'fetch');
    fetcher.mockClear();
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(event).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('un 401 del servidor vence la sesión, un 403 conserva la identidad', async () => {
    const event = vi.fn();
    window.addEventListener('vexor:session-expired', event);
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 403 }));
    await expect(api('/negocios/ajeno')).rejects.toMatchObject({ status: 403 });
    expect(event).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(event).toHaveBeenCalledOnce();
    window.removeEventListener('vexor:session-expired', event);
  });
  it('no muestra mensajes internos enviados por el servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'postgresql://secret' }, requestId: 'safe-id' }),
        { status: 500 },
      ),
    );
    await expect(api('/me')).rejects.toMatchObject({
      message: 'No se pudo completar la solicitud. Vuelve a intentar.',
      requestId: 'safe-id',
    });
  });
  it('recorre listas completas sin perder negocios por paginación', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: Array.from({ length: 100 }, (_, i) => i) })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [100, 101] })));
    expect(await listAll('/me/negocios')).toHaveLength(102);
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/v1/me/negocios?limit=100&offset=100',
      expect.anything(),
    );
  });
});
