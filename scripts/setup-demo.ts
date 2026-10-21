import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { secureDatabaseUrl } from '../src/database/database.ts';
import { loadConfig } from '../src/config.ts';

// Explicit, development-only onboarding. Never imported by an HTTP entrypoint.
if (process.env.VEXOR_PROVISION_TARGET !== 'development')
  throw new Error('Solo para desarrollo explícito');
const [email, nombre, negocio] = process.argv.slice(2);
if (!email || !nombre || !negocio)
  throw new Error('Indica correo, nombre y nombre del negocio demo');
const config = loadConfig();
const client = createClient(config.supabaseUrl, config.supabaseSecretKey!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let identity: string | undefined;
for (let page = 1; page <= 100; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error('No se pudo consultar Auth');
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    if (!user.email_confirmed_at)
      throw new Error('El destinatario debe confirmar su correo primero');
    identity = user.id;
    break;
  }
  if (data.users.length < 100) break;
}
if (!identity) throw new Error('No se encontró la identidad confirmada');
const admin = new Client({
  connectionString: secureDatabaseUrl(process.env.MIGRATION_DATABASE_URL!),
});
try {
  await admin.connect();
  await admin.query(
    'insert into app_private.administradores_plataforma(auth_user_id) values($1) on conflict(auth_user_id) do update set activo=true',
    [identity],
  );
} finally {
  await admin.end();
}
// Persist the idempotency key locally before requesting an invitation.
await mkdir('test-results', { recursive: true });
const file = 'test-results/demo-invitation.json';
let saved: { id: string; email: string; nombre: string; negocio: string };
try {
  saved = JSON.parse(await readFile(file, 'utf8'));
  if (saved.email !== email || saved.nombre !== nombre || saved.negocio !== negocio)
    throw new Error('Existe otra solicitud demo; consérvala y usa otra operación explícita');
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  saved = { id: randomUUID(), email, nombre, negocio };
  await writeFile(file, JSON.stringify(saved, null, 2), { flag: 'wx' });
}
const { DatabaseService } = await import('../dist/database/database.service.js');
const { InvitationMailService } = await import('../dist/invitations/mail.service.js');
const { InvitationsService } = await import('../dist/invitations/invitations.service.js');
const db = new DatabaseService(config);
try {
  await db.onModuleInit();
  const invitations = new InvitationsService(db, new InvitationMailService(config));
  const result = await invitations.create({ authUserId: identity, email }, undefined, saved.id, {
    email,
    nombre,
    negocio_nombre: negocio,
    zona_horaria: 'America/Lima',
  });
  console.log(
    JSON.stringify({
      administrador_habilitado: true,
      invitacion_guardada: true,
      estado_envio: result.estado_envio,
      error_codigo: result.error_codigo,
      aceptada: !!result.aceptada_en,
    }),
  );
} finally {
  await db.onModuleDestroy();
}
