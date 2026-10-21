import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import supertest from 'supertest';
// Requires build:api and the existing local runtime. No database mutations.
const { default: serve } = await import(pathToFileURL(resolve('api/index.ts')).href);
try {
  const api = supertest(serve);
  await api.get('/api/v1/health').expect(200);
  await api.get('/api/v1/health/ready').expect(200);
  await api.get('/api/v1/me').expect(401).expect('Cache-Control', 'private, no-store');
  console.log(
    'Adaptador Vercel local: health, SQL ready y rechazo sin sesión correctos. Esto no prueba un despliegue de Vercel.',
  );
  process.exit(0);
} catch {
  console.error('Falló la comprobación local del adaptador.');
  process.exit(1);
}
