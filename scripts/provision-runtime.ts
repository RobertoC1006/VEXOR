import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { access, writeFile } from 'node:fs/promises';
import { secureDatabaseUrl } from '../src/database/database.ts';

// Credencial nueva solo por invocación administrativa explícita. Nunca se imprime.
if(process.env.VEXOR_PROVISION_TARGET!=='development') throw new Error('Establece VEXOR_PROVISION_TARGET=development');
const suppliedAdminUrl=process.env.MIGRATION_DATABASE_URL;
if(!suppliedAdminUrl) throw new Error('Falta MIGRATION_DATABASE_URL administrativa');
const adminUrl=secureDatabaseUrl(suppliedAdminUrl);
const destination=resolve('.env.runtime');
try {await access(destination);throw new Error('Ya existe .env.runtime; no se reemplazan credenciales');}
catch(error:any) {if(error.code!=='ENOENT') throw error;}
const password=randomBytes(32).toString('hex');
let url:URL;
try {url=new URL(adminUrl);} catch {throw new Error('MIGRATION_DATABASE_URL inválida');}
const originalUser=decodeURIComponent(url.username);
const suffix=originalUser.startsWith('postgres.')?originalUser.slice('postgres'.length):'';
url.username=`vexor_backend${suffix}`;url.password=password;
const client=new Client({connectionString:adminUrl});
let fileCreated=false;
try {
  await client.connect();await client.query('begin');
  if((await client.query("select 1 from pg_roles where rolname='vexor_backend'")).rowCount) throw new Error('El rol vexor_backend ya existe; no se cambian sus credenciales');
  // Contraseña hexadecimal generada; el nombre de rol no proviene de entradas libres.
  await client.query(`create role vexor_backend login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '${password}';
    grant vexor_runtime to vexor_backend;`);
  await writeFile(destination,`# Solo servidor. Archivo ignorado por Git.\nDATABASE_URL=${url.toString()}\n`,{flag:'wx',mode:0o600});
  fileCreated=true;await client.query('commit');
  console.log('Cuenta SQL restringida creada. Credencial guardada en .env.runtime; no se ha impreso ni publicado.');
} catch(error) {
  await client.query('rollback').catch(()=>{});
  throw new Error(fileCreated
    ? 'No se pudo confirmar el aprovisionamiento. Se conservó .env.runtime para poder verificar el resultado sin perder la credencial.'
    : 'No se completó el aprovisionamiento; comprueba que la cuenta y el archivo no existan y que uses el administrador de desarrollo.');
} finally {await client.end();}
