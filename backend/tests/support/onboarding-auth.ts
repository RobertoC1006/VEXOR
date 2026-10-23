import assert from 'node:assert/strict';
import type { Client } from 'pg';
import { startAuthServer } from './auth-server.ts';
// Tests the isolated mailbox adapter; no real account or credentials are involved.
export async function testLocalInvitationAuth(database: Client, userId: string) {
  const auth = await startAuthServer(
    database,
    [{ id: userId, email: 'cuenta.local@example.test', confirmed: false }],
    'Solo-demo-inicial-2026',
  );
  try {
    const link = new URL(await auth.invitationLink(userId));
    const params = new URLSearchParams(link.hash.slice(1));
    const token = params.get('access_token')!;
    const send = (path: string, body: object, authenticated = true) =>
      fetch(`${auth.url}/auth/v1/${path}`, {
        method: path === 'user' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    assert.equal((await send('user', { password: 'Demo-segura-local-2026' }, false)).status, 401);
    assert.equal((await send('user', { password: 'corta' })).status, 422);
    assert.equal((await send('user', { password: 'Demo-segura-local-2026' })).status, 200);
    assert.equal(
      (
        await send('token?grant_type=password', {
          email: 'cuenta.local@example.test',
          password: 'Solo-demo-inicial-2026',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await send('token?grant_type=password', {
          email: 'cuenta.local@example.test',
          password: 'Demo-segura-local-2026',
        })
      ).status,
      200,
    );
    assert.equal(
      (await send('token?grant_type=refresh_token', { refresh_token: params.get('refresh_token') }))
        .status,
      200,
    );
  } finally {
    await auth.close();
  }
}
