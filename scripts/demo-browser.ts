import { createServer } from 'vite';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startTestDatabase } from './testing/postgres.ts';
import { startAuthServer } from './testing/auth-server.ts';

// Entirely local fixture: PostgreSQL, signed Auth JWTs and the real Nest/PWA.
// It never loads .env credentials into the backend or writes to vexor-dev.
const db = await startTestDatabase();
const id = (n: number) => `de000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.admin.query(`insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(3)}');
 insert into app.usuarios(id,auth_user_id,nombre) values('${id(11)}','${id(1)}','Roberto Demo'),('${id(12)}','${id(2)}','Ana Demo');
 insert into app.negocios(id,nombre) values('${id(21)}','Comercial La Aurora'),('${id(22)}','Bodega Los Olivos');
 insert into app.miembros_negocio(negocio_id,usuario_id,es_propietario) values('${id(21)}','${id(11)}',true),('${id(22)}','${id(11)}',true),('${id(21)}','${id(12)}',false);
 insert into app.locales(negocio_id,nombre,habilitado_venta) values('${id(21)}','Puesto principal',true),('${id(21)}','Almacén central',false);
 insert into app_private.administradores_plataforma(auth_user_id) values('${id(1)}');
 select set_config('vexor.auth_user_id','${id(1)}',false);`);
// Use the shared actor helper instead of relying on a privileged session context.
const { withActor, createDatabase } = await import('../src/database/database.ts');
const runtime = createDatabase(db.url, 1);
const { sql } = await import('kysely');
await withActor(runtime, { authUserId: id(1), email: 'propietario@example.test' }, (tx) =>
  sql`select app_private.solicitar_invitacion(${id(31)}::uuid,null::uuid,'invitado@example.test','Invitado Demo','Mercado Nuevo','America/Lima')`.execute(
    tx,
  ),
);
await runtime.destroy();
const auth = await startAuthServer(
  db.admin,
  [
    { id: id(1), email: 'propietario@example.test' },
    { id: id(2), email: 'trabajador@example.test' },
    { id: id(3), email: 'invitado@example.test' },
  ],
  'Vexor-demo-local-2026',
);
const { createApp } = await import(pathToFileURL(resolve('dist/app.factory.js')).href);
const app = await createApp(
  {
    databaseUrl: db.url,
    databasePoolMax: 2,
    supabaseUrl: auth.url,
    supabaseKey: 'test-publishable',
    supabaseSecretKey: 'test-secret',
    invitationRedirectUrl: 'http://localhost:5174/auth/callback',
    port: 3001,
    host: '127.0.0.1',
    origins: ['http://localhost:5174'],
    production: false,
  },
  true,
);
await app.listen(3001, '127.0.0.1');
process.env.SUPABASE_URL = auth.url;
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable';
process.env.VEXOR_DEV_API_TARGET = 'http://127.0.0.1:3001';
const vite = await createServer({ server: { port: 5174, strictPort: true } });
await vite.listen();
console.log(
  'Demo LOCAL aislada: http://localhost:5174. Usuarios: propietario@example.test, trabajador@example.test, invitado@example.test. Contraseña ficticia: Vexor-demo-local-2026. No usar en vexor-dev.',
);
let closed = false;
async function close() {
  if (closed) return;
  closed = true;
  await vite.close();
  await app.close();
  await auth.close();
  await db.close();
  process.exit(0);
}
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
