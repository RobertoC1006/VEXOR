import { Client } from 'pg';
import { secureDatabaseUrl } from '../src/compartido/database/database.ts';

// Uso administrativo explícito, fuera del proceso HTTP. No autorregistra administradores.
const authId=process.argv[2];
if(!authId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authId)) throw new Error('Indica el UUID de una identidad Auth confirmada');
if(process.env.VEXOR_PROVISION_TARGET!=='development') throw new Error('Establece VEXOR_PROVISION_TARGET=development');
if(!process.env.MIGRATION_DATABASE_URL) throw new Error('Falta MIGRATION_DATABASE_URL administrativa');
const client=new Client({connectionString:secureDatabaseUrl(process.env.MIGRATION_DATABASE_URL)});
try {
  await client.connect();
  await client.query('insert into app_private.administradores_plataforma(auth_user_id) values($1) on conflict(auth_user_id) do update set activo=true',[authId]);
  console.log('Administrador de plataforma habilitado. No se ha concedido ninguna membresía comercial.');
} finally {await client.end();}
