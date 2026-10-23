import { createServer, type ViteDevServer } from 'vite';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startTestDatabase } from '../tests/support/postgres.ts';
import { startAuthServer } from '../tests/support/auth-server.ts';

// Entirely local fixture: PostgreSQL, signed Auth JWTs and the real Nest/PWA.
// It never loads .env credentials into the backend or writes to vexor-dev.
const db = await startTestDatabase();
const id = (n: number) => `de000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.admin
  .query(`insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(5)}');
 insert into app.usuarios(id,auth_user_id,nombre) values('${id(11)}','${id(1)}','Roberto Demo'),('${id(12)}','${id(2)}','Ana Demo');
 insert into app.negocios(id,nombre) values('${id(21)}','Comercial La Aurora'),('${id(22)}','Bodega Los Olivos');
 insert into app.miembros_negocio(negocio_id,usuario_id,es_propietario) values('${id(21)}','${id(11)}',true),('${id(22)}','${id(11)}',true),('${id(21)}','${id(12)}',false);
 insert into app.locales(negocio_id,nombre,habilitado_venta) values('${id(21)}','Puesto principal',true),('${id(21)}','Almacén central',false);
 insert into app_private.administradores_plataforma(auth_user_id) values('${id(1)}');
 select set_config('vexor.auth_user_id','${id(1)}',false);`);
await db.admin.query(`insert into auth.users(id) values('${id(4)}');
 insert into app.usuarios(id,auth_user_id,nombre) values('${id(14)}','${id(4)}','María QA');
 insert into app.negocios(id,nombre) values('${id(23)}','Lencería QA'),('${id(24)}','Abarrotes QA');
 insert into app.miembros_negocio(negocio_id,usuario_id,es_propietario) values('${id(23)}','${id(14)}',true),('${id(24)}','${id(14)}',true);
 insert into app.locales(negocio_id,nombre,habilitado_venta) values('${id(23)}','Puesto piloto',true),('${id(23)}','Almacén de respaldo',false),('${id(24)}','Puesto bodega',true);`);
// Use the shared actor helper instead of relying on a privileged session context.
const { withActor, createDatabase } = await import('../src/compartido/database/database.ts');
// Existing demonstration businesses represent configured merchants.
await db.admin.query('update app.negocio_perfil set onboarding_paso=3');
const runtime = createDatabase(db.url, 1);
const { sql } = await import('kysely');
await withActor(runtime, { authUserId: id(1), email: 'propietario@example.test' }, (tx) =>
  sql`select app_private.solicitar_invitacion(${id(31)}::uuid,null::uuid,'invitado@example.test','Invitado Demo','Mercado Nuevo','America/Lima')`.execute(
    tx,
  ),
);
await runtime.destroy();
const invitations = createDatabase(db.url, 1);
await withActor(invitations, { authUserId: id(1), email: 'propietario@example.test' }, (tx) =>
  sql`select app_private.solicitar_invitacion(${id(32)}::uuid,null::uuid,'nuevo.mercado@example.test','Lucía Demo','Mi nuevo negocio','America/Lima')`.execute(
    tx,
  ),
);
await invitations.destroy();
const auth = await startAuthServer(
  db.admin,
  [
    { id: id(1), email: 'propietario@example.test' },
    { id: id(4), email: 'qa.mercado@example.test' },
    { id: id(2), email: 'trabajador@example.test' },
    { id: id(3), email: 'invitado@example.test' },
    { id: id(5), email: 'nuevo.mercado@example.test', confirmed: false },
  ],
  'Vexor-demo-local-2026',
);
const { createApp } = await import(pathToFileURL(resolve('dist/backend/app.factory.js')).href);
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
const vite = await createServer({
  plugins: [
    {
      name: 'demo-mailbox',
      configureServer(server) {
        installMailbox(server);
      },
    },
  ],
  configFile: 'frontend/vite.config.ts',
  server: { port: 5174, strictPort: true },
});
// Simulated mailbox, mounted only by this isolated development script.
function installMailbox(vite: ViteDevServer) {
  vite.middlewares.use('/demo/invitacion', async (_req, res) => {
    res.statusCode = 302;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', await auth.invitationLink(id(5)));
    res.end();
  });
  vite.middlewares.use('/demo', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invitación de prueba · VEXOR</title><style>body{margin:0;background:#f5f7fc;color:#0b193d;font:17px/1.7 system-ui}main{max-width:620px;margin:8vh auto;padding:32px}article{background:white;border:1px solid #e3e8f2;border-radius:18px;padding:32px}h1{font-size:30px;line-height:1.3}small,p{color:#5d6b85}a{display:inline-block;background:#3457ef;color:white;text-decoration:none;padding:14px 24px;border-radius:9px;font-weight:600}header{font-size:30px;font-weight:800;margin-bottom:32px}span{color:#3457ef}</style><main><header>VE<span>X</span>OR</header><small>DEMO LOCAL · CORREO SIMULADO</small><article><h1>Lucía, tu negocio empieza aquí.</h1><p>Recibiste una invitación para preparar <strong>Mi nuevo negocio</strong>.</p><p>Correo ficticio: <strong>nuevo.mercado@example.test</strong></p><a href="/demo/invitacion">Abrir mi invitación</a><p>Crearás tu contraseña de prueba, aceptarás la invitación y configurarás tu negocio en tres pasos.</p></article><p>Esta demo se ejecuta solo en esta computadora. No envía correos reales ni modifica Vercel. Usa una contraseña inventada para esta prueba.</p></main></html>`,
    );
  });
}
await vite.listen();
console.log(
  'Demo LOCAL aislada: http://localhost:5174. Usuarios: propietario@example.test, trabajador@example.test, invitado@example.test, qa.mercado@example.test. Contraseña ficticia: Vexor-demo-local-2026. No usar en vexor-dev.',
);
console.log('Invitación ficticia lista para probar: http://localhost:5174/demo');
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
