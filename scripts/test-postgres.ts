import { spawn, spawnSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { sql } from 'kysely';
import { createDatabase, withTenant, requirePermission } from '../src/database/database.ts';

// Contenedor propio, puerto aleatorio solo en loopback, sin volúmenes ni datos reales.
const container = `vexor-core-tests-${process.pid}`;
const database = 'postgres';
const password = randomBytes(24).toString('hex');
const pools: ReturnType<typeof createDatabase>[] = [];
let started = false;
function docker(args: string[], input?: string) {
  const r = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Docker falló');
  return r.stdout;
}
function query(text: string) {
  return docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], text);
}
function concurrentQuery(text: string) {
  const p = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: 'pipe' });
  let output = ''; let error = ''; let signal: () => void;
  const locked = new Promise<void>(resolve => { signal = resolve; });
  p.stdout.on('data', chunk => { output += chunk; if (output.includes('LOCK_ACQUIRED')) signal(); });
  p.stderr.on('data', chunk => { error += chunk; });
  const completed = new Promise<{ status: number | null; output: string; error: string }>((resolve, reject) => {
    p.on('error', reject);
    p.on('close', status => resolve({ status, output, error }));
  });
  p.stdin.end(text);
  return { locked, completed };
}
const id = (n: number) => `ac000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
try {
  docker(['run', '--rm', '-d', '--name', container, '--publish', '127.0.0.1::5432', '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:17-alpine']);
  started = true;
  let ready = false;
  for (let i=0; i<50; i++) {
    const r = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], {encoding:'utf8'});
    if (r.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('PostgreSQL no quedó listo');
  query(await readFile('tests/db/bootstrap.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    query(`begin;\n${await readFile(`supabase/migrations/${file}`, 'utf8')}\ncommit;`);
  }
  const output = query(await readFile('tests/db/nucleo.sql', 'utf8'));
  const summary = output.split('\n').filter(s => s.includes('comprobaciones OK') || s.startsWith('OK:'));
  query(`begin;
    insert into auth.users(id) values('${id(61)}'),('${id(62)}');
    insert into app.usuarios(id,auth_user_id,nombre) values('${id(161)}','${id(61)}','Prueba concurrente 1'),('${id(162)}','${id(62)}','Prueba concurrente 2');
    insert into app.negocios(id,nombre) values('${id(261)}','Negocio concurrencia');
    insert into app.miembros_negocio(id,negocio_id,usuario_id,es_propietario) values
      ('${id(361)}','${id(261)}','${id(161)}',true),('${id(362)}','${id(261)}','${id(162)}',true);
    commit;`);
  for (const isolation of ['read committed', 'repeatable read']) {
    query(`update app.miembros_negocio set es_propietario=true where negocio_id='${id(261)}';`);
    const context = (actor: number) => `set local role vexor_runtime;
      select set_config('vexor.actor_id','${id(actor)}',true),set_config('vexor.negocio_id','${id(261)}',true);`;
    const first = concurrentQuery(`begin isolation level ${isolation}; ${context(61)}
      update app.miembros_negocio set es_propietario=false where id='${id(361)}';
      select 'LOCK_ACQUIRED'; select pg_sleep(1); commit;`);
    const gate = await Promise.race([first.locked.then(() => true), first.completed.then(() => false)]);
    if (!gate) throw new Error('La primera transacción terminó antes de tomar el bloqueo');
    const second = concurrentQuery(`begin isolation level ${isolation}; ${context(62)}
      update app.miembros_negocio set es_propietario=false where id='${id(362)}'; commit;`);
    const [a,b] = await Promise.all([first.completed, second.completed]);
    const expected = isolation === 'read committed' ? 'propietario activo' : 'could not serialize';
    if (a.status !== 0 || b.status === 0 || !b.error.includes(expected)) throw new Error(JSON.stringify({ isolation, a, b }));
    if (query(`select count(*) from app.miembros_negocio where negocio_id='${id(261)}' and es_propietario and activo;`).trim() !== '1') throw new Error('Se perdió el último propietario');
    summary.push(`OK: dos bajas concurrentes preservan propietario (${isolation})`);
  }
  // Cuenta real del servidor sin herencia ni privilegios administrativos.
  query(`create role vexor_backend_test login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '${password}';
    grant vexor_runtime to vexor_backend_test;`);
  const port = docker(['port', container, '5432/tcp']).trim().split(':').at(-1);
  const db = createDatabase(`postgresql://vexor_backend_test:${password}@127.0.0.1:${port}/postgres`, 1);
  const admin = createDatabase(`postgresql://postgres:${password}@127.0.0.1:${port}/postgres`, 1);
  pools.push(db, admin);
  const context = { authUserId:id(62), negocioId:id(261) };
  await assert.rejects(() => db.selectFrom('app.negocios').selectAll().execute(), /permission denied/);
  await withTenant(db, context, async tx => {
    assert.equal((await tx.selectFrom('app.negocios').selectAll().execute()).length, 1);
    await requirePermission(tx, 'negocio.editar');
    await assert.rejects(() => requirePermission(tx, 'accion.inexistente'), /Permiso insuficiente/);
  });
  await assert.rejects(() => withTenant(db, { ...context, negocioId:id(999) }, async () => undefined), /Sin membresía/);
  await assert.rejects(() => withTenant(db, context, async tx => {
    await tx.updateTable('app.negocios').set({nombre:'Debe revertirse'}).execute();
    throw new Error('Fallo simulado');
  }), /Fallo simulado/);
  await withTenant(db, context, async tx => {
    assert.equal((await tx.selectFrom('app.negocios').select('nombre').executeTakeFirstOrThrow()).nombre, 'Negocio concurrencia');
  });
  const after = await sql<{ actor: string | null; negocio: string | null }>`select
    nullif(current_setting('vexor.actor_id',true),'') as actor,
    nullif(current_setting('vexor.negocio_id',true),'') as negocio`.execute(db);
  assert.deepEqual(after.rows[0], {actor:null, negocio:null});
  await assert.rejects(() => withTenant(admin, context, async () => undefined), /privilegiada rechazada/);
  summary.push('OK: Kysely/pg con login restringido, pool de una conexión, rollback, autorización y rechazo de cuenta privilegiada');
  await mkdir('test-results', {recursive:true});
  await writeFile('test-results/nucleo-postgres.json', JSON.stringify({ version: query('select version();').trim(), summary }, null, 2));
  console.log(summary.join('\n'));
} catch (error: any) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await Promise.all(pools.map(pool => pool.destroy()));
  if (started) docker(['stop', container]);
}
