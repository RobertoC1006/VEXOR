import assert from 'node:assert/strict';
import type { testConfiguration } from './configuration.ts';
export async function testOnboarding(
  request: Parameters<typeof testConfiguration>[0],
  businessId: string,
) {
  const base = `/api/v1/negocios/${businessId}`;
  assert.equal((await request('get', base, 10, 200)).body.onboarding_paso, 0);
  await request('post', `${base}/onboarding`, 10, 400, { paso: 0 });
  await request('post', `${base}/onboarding`, 10, 400, { paso: '1' });
  await request('post', `${base}/onboarding`, 10, 409, { paso: 3 });
  await request('post', `${base}/onboarding`, 1, 403, { paso: 1 });
  await request('post', `${base}/onboarding`, 10, 400, { paso: 1 });
  await request('patch', base, 10, 200, { nombre: 'Lencería bienvenida', rubro: 'Lencería' });
  assert.equal(
    (await request('post', `${base}/onboarding`, 10, 201, { paso: 1 })).body.onboarding_paso,
    1,
  );
  assert.equal((await request('get', base, 10, 200)).body.onboarding_paso, 1);
  await request('post', `${base}/onboarding`, 10, 409, { paso: 3 });
  await request('post', `${base}/onboarding`, 10, 400, { paso: 2 });
  await request('post', `${base}/locales`, 10, 201, {
    nombre: 'Puesto inicial',
    habilitado_venta: true,
    mercado: 'Mercado QA',
    numero_puesto: 'A15',
  });
  assert.equal(
    (await request('post', `${base}/onboarding`, 10, 201, { paso: 2 })).body.onboarding_paso,
    2,
  );
  assert.equal(
    (await request('post', `${base}/onboarding`, 10, 201, { paso: 1 })).body.onboarding_paso,
    2,
  );
  assert.equal(
    (await request('post', `${base}/onboarding`, 10, 201, { paso: 3 })).body.onboarding_paso,
    3,
  );
  assert.equal(
    (await request('post', `${base}/onboarding`, 10, 201, { paso: 1 })).body.onboarding_paso,
    3,
  );
  await request('patch', base, 10, 400, { onboarding_paso: 0 });
}
