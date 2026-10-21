import assert from 'node:assert/strict';
// Read-only smoke test against either the Render API or its Vercel proxy.
const origin = new URL(process.env.VEXOR_SMOKE_ORIGIN ?? 'http://127.0.0.1:3000');
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('El destino remoto debe usar HTTPS');
}
try {
  for (const [path, status] of [['health', 200], ['health/ready', 200], ['me', 401]] as const) {
    const response = await fetch(new URL(`/api/v1/${path}`, origin), { signal: AbortSignal.timeout(120_000) });
    assert.equal(response.status, status, path);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    await response.json();
  }
  console.log('HTTP: health, SQL ready y rechazo sin sesión correctos; API sin caché.');
} catch {
  console.error('Falló la comprobación HTTP del alojamiento.');
  process.exit(1);
}
