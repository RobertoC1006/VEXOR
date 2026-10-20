import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { sql } from 'kysely';
import { createDatabase, withTenant, requirePermission } from '../src/database/database.ts';
import { startTestDatabase } from './testing/postgres.ts';

let database:Awaited<ReturnType<typeof startTestDatabase>>|undefined;
const pools:ReturnType<typeof createDatabase>[]=[];
const id=(n:number)=>`ac000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try {
  database=await startTestDatabase();
  const admin=database.admin;
  const summary:string[]=[];
  for(const file of ['tests/db/nucleo.sql','tests/db/backend_acceso.sql']) {
    const result=await admin.query(await readFile(file,'utf8'));
    summary.push(...(Array.isArray(result)?result:[result]).flatMap(r=>r.rows).filter(r=>r.resultado).map(r=>r.resultado));
  }
  await admin.query(`begin;
    insert into auth.users(id) values('${id(61)}'),('${id(62)}');
    insert into app.usuarios(id,auth_user_id,nombre) values('${id(161)}','${id(61)}','Concurrente 1'),('${id(162)}','${id(62)}','Concurrente 2');
    insert into app.negocios(id,nombre) values('${id(261)}','Negocio concurrencia');
    insert into app.miembros_negocio(id,negocio_id,usuario_id,es_propietario) values
      ('${id(361)}','${id(261)}','${id(161)}',true),('${id(362)}','${id(261)}','${id(162)}',true);
    commit;`);
  const first=new Client({connectionString:database.url}),second=new Client({connectionString:database.url});
  await first.connect();await second.connect();
  try {
    for(const isolation of ['read committed','repeatable read']) {
      await admin.query('update app.miembros_negocio set es_propietario=true where negocio_id=$1',[id(261)]);
      const begin=async(client:Client,actor:number)=>{
        await client.query(`begin isolation level ${isolation}; set local role vexor_runtime;`);
        await client.query("select set_config('vexor.actor_id',$1,true),set_config('vexor.negocio_id',$2,true)",[id(actor),id(261)]);
      };
      await begin(first,61);await begin(second,62);
      const pid=(await second.query('select pg_backend_pid() as pid')).rows[0].pid;
      await first.query('update app.miembros_negocio set es_propietario=false where id=$1',[id(361)]);
      const pending=(async()=>{
        try {await second.query('update app.miembros_negocio set es_propietario=false where id=$1',[id(362)]);await second.query('commit');return null;}
        catch(error:any) {await second.query('rollback');return error.code as string;}
      })();
      let blocked=false;
      for(let i=0;i<50;i++) {
        blocked=(await admin.query('select cardinality(pg_blocking_pids($1))>0 as blocked',[pid])).rows[0].blocked;
        if(blocked)break;await new Promise(resolve=>setTimeout(resolve,10));
      }
      assert.equal(blocked,true,'Las bajas deben contender realmente por el mismo negocio');
      await first.query('commit');
      assert.equal(await pending,isolation==='read committed'?'23514':'40001');
      assert.equal(Number((await admin.query('select count(*) from app.miembros_negocio where negocio_id=$1 and es_propietario and activo',[id(261)])).rows[0].count),1);
      summary.push(`OK: dos bajas concurrentes preservan propietario (${isolation})`);
    }
  } finally {await first.query('rollback').catch(()=>{});await second.query('rollback').catch(()=>{});await first.end();await second.end();}
  const db=createDatabase(database.url,1),unsafe=createDatabase(database.adminUrl,1);pools.push(db,unsafe);
  const context={authUserId:id(62),negocioId:id(261)};
  await assert.rejects(()=>db.selectFrom('app.negocios').selectAll().execute(),/permission denied/);
  await withTenant(db,context,async tx=>{
    assert.equal((await tx.selectFrom('app.negocios').selectAll().execute()).length,1);
    await requirePermission(tx,'negocio.editar');
    await assert.rejects(()=>requirePermission(tx,'accion.inexistente'),/Permiso insuficiente/);
  });
  await assert.rejects(()=>withTenant(db,{...context,negocioId:id(999)},async()=>undefined),/Sin membresía/);
  await assert.rejects(()=>withTenant(db,context,async tx=>{
    await tx.updateTable('app.negocios').set({nombre:'Debe revertirse'}).execute();throw new Error('Fallo simulado');
  }),/Fallo simulado/);
  await withTenant(db,context,async tx=>assert.equal((await tx.selectFrom('app.negocios').select('nombre').executeTakeFirstOrThrow()).nombre,'Negocio concurrencia'));
  const after=await sql<{actor:string|null;negocio:string|null;email:string|null}>`select nullif(current_setting('vexor.actor_id',true),'') as actor,
    nullif(current_setting('vexor.negocio_id',true),'') as negocio,nullif(current_setting('vexor.actor_email',true),'') as email`.execute(db);
  assert.deepEqual(after.rows[0],{actor:null,negocio:null,email:null});
  await assert.rejects(()=>withTenant(unsafe,context,async()=>undefined),/privilegiada rechazada/);
  summary.push('OK: Kysely/pg, login restringido, rollback y limpieza del pool');
  await mkdir('test-results',{recursive:true});
  await writeFile('test-results/nucleo-postgres.json',JSON.stringify({version:(await admin.query('select version()')).rows[0].version,summary},null,2));
  console.log(summary.join('\n'));
} catch(error:any) {console.error(error.message);process.exitCode=1;
} finally {await Promise.all(pools.map(p=>p.destroy()));await database?.close();}
if(process.exitCode)process.exit(process.exitCode);
