import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { secureDatabaseUrl } from '../src/compartido/database/database.ts';

// Publicación manual y acotada del bloque. Nunca se importa desde el servidor.
if (process.env.VEXOR_PROVISION_TARGET !== 'development')
  throw new Error('Solo para desarrollo explícito');
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
if (!migrationUrl || !supabaseUrl) throw new Error('Falta la configuración privada de desarrollo');
const reference = new URL(supabaseUrl).hostname.split('.')[0];
const target = new URL(migrationUrl);
if (
  target.hostname !== `db.${reference}.supabase.co` &&
  !decodeURIComponent(target.username).endsWith(`.${reference}`)
)
  throw new Error('La conexión de migración no coincide con el proyecto Auth');
const files = [
  '20261021000200_productos_inventario_inicial.sql',
  '20261021000300_niveles_variantes.sql',
  '20261021000400_categorias_registro_guiado.sql',
  '20261021000500_plantillas_categorias.sql',
  '20261021000600_fotos_productos.sql',
  '20261022000100_perfil_minimos.sql',
  '20261023000100_onboarding.sql',
  '20261023000200_movimientos_stock.sql',
  '20261023000300_ventas_pos.sql',
  '20261023000400_carritos_espera.sql',
];
const client = new Client({ connectionString: secureDatabaseUrl(migrationUrl) });
try {
  await client.connect();
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtext('vexor:productos:migracion'))");
  const applied = new Set(
    (await client.query('select version from supabase_migrations.schema_migrations')).rows.map(
      (r) => r.version,
    ),
  );
  if (!applied.has('20261021000100')) throw new Error('Falta la base publicada de configuración');
  const pending = files.filter((f) => !applied.has(f.split('_')[0]));
  console.log(JSON.stringify({ pendientes: pending, aplicar: process.argv.includes('--apply') }));
  if (process.argv.includes('--apply')) {
    for (const file of pending) {
      const source = await readFile(`backend/supabase/migrations/${file}`, 'utf8');
      await client.query(source);
      const version = file.split('_')[0],
        name = file.slice(version.length + 1, -4);
      await client.query(
        'insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',
        [version, name, [source]],
      );
    }
    const protection = (
      await client.query(
        "select count(*)::int as n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='app' and c.relname in ('productos','inventario_inicial','categorias','productos_fotos','negocio_perfil','stock_minimos','stock_movimientos','ventas_politicas','presentaciones','ventas','ventas_lineas','ventas_carritos') and c.relrowsecurity and c.relforcerowsecurity",
      )
    ).rows[0].n;
    if (protection !== 12) throw new Error('No se verificó RLS forzada en las doce tablas');
    const onboarding = (
      await client.query(
        "select count(*)::int as n from information_schema.columns where table_schema='app' and table_name='negocio_perfil' and column_name='onboarding_paso'",
      )
    ).rows[0].n;
    if (onboarding !== 1) throw new Error('No se verificó el estado persistente del onboarding');
    await client.query('commit');
    console.log('Migraciones del bloque aplicadas y registradas; RLS forzada verificada.');
  } else await client.query('rollback');
} catch (error) {
  await client.query('rollback').catch(() => {});
  // No imprimir URLs, consultas completas ni detalles que puedan incluir configuración.
  console.error(
    error instanceof Error
      ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[conexión omitida]')
      : 'Falló la migración',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
