import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Alternativa cuando el acceso autorizado disponible es la sesión del Dashboard.
// Aplica EXACTAMENTE el archivo versionado y registra el historial en el mismo commit.
const file = process.argv[2] ?? '20261020000100_nucleo';
const match = /^(\d{14})_([a-z_]+)$/.exec(file);
if (!match) throw new Error('Usa el nombre de migración sin extensión');
const [,version,name] = match;
const source = await readFile(`supabase/migrations/${version}_${name}.sql`, 'utf8');
const tag = '$vexor_migration_source$';
if (source.includes(tag)) throw new Error('El delimitador aparece en la migración');
const deploy = `begin;
${source}
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, statements text[], name text
);
alter table supabase_migrations.schema_migrations enable row level security;
alter table supabase_migrations.schema_migrations force row level security;
revoke all on schema supabase_migrations from public, anon, authenticated, service_role, vexor_runtime;
revoke all on supabase_migrations.schema_migrations from public, anon, authenticated, service_role, vexor_runtime;
insert into supabase_migrations.schema_migrations(version,name,statements)
values('${version}','${name}',array[replace(${tag}${source}${tag},chr(13)||chr(10),chr(10))]);
commit;
select version, name, encode(sha256(convert_to(statements[1],'UTF8')),'hex') as sha256,
  (select count(*) from pg_tables where schemaname='app') as tablas
from supabase_migrations.schema_migrations where version='${version}';
`;
await mkdir('test-results', {recursive:true});
await writeFile(`test-results/aplicar-${file}-dashboard.sql`, deploy);
console.log(`Preparado despliegue atómico. SHA256: ${createHash('sha256').update(source).digest('hex')}`);
