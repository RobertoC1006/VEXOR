import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { createServer } from 'node:net';
import { resolve, relative, isAbsolute } from 'node:path';
import { mkdir } from 'node:fs/promises';

function docker(args:string[]) {
  const r=spawnSync('docker',args,{encoding:'utf8',timeout:30000});
  if(r.status!==0) throw new Error(r.stderr||r.error?.message||'Docker no disponible');
  return r.stdout.trim();
}
export async function startTestDatabase() {
  const name=`vexor-api-tests-${process.pid}`;
  const password=randomBytes(24).toString('hex');
  const engine=process.env.VEXOR_TEST_ENGINE??(process.platform==='win32'?'native':'docker');
  let native:EmbeddedPostgres|undefined;
  let port:string|undefined;
  let cleanup:()=>Promise<void>;
  if(engine==='native') {
    const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
    const address=probe.address();if(!address || typeof address==='string') throw new Error('Puerto de prueba no disponible');
    port=String(address.port);await new Promise<void>(resolve=>probe.close(()=>resolve()));
    const base=resolve('test-results');await mkdir(base,{recursive:true});
    const directory=resolve(base,`${name}-${randomBytes(6).toString('hex')}`);
    const rel=relative(base,directory);
    if(rel.startsWith('..') || isAbsolute(rel) || !rel.startsWith('vexor-api-tests-')) throw new Error('Ruta de prueba insegura');
    native=new EmbeddedPostgres({databaseDir:directory,user:'postgres',password,port:Number(port),persistent:false,
      authMethod:'scram-sha-256',createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],
      postgresFlags:['-h','127.0.0.1','-c','lc_messages=C'],onLog:()=>{},onError:()=>{}});
    await native.initialise();await native.start();
    cleanup=()=>native!.stop();
  } else if(engine==='docker') {
    docker(['run','--rm','-d','--name',name,'--publish','127.0.0.1::5432','-e',`POSTGRES_PASSWORD=${password}`,'postgres:17-alpine']);
    port=docker(['port',name,'5432/tcp']).split(':').at(-1);
    cleanup=async()=>{docker(['stop',name]);};
  } else throw new Error('VEXOR_TEST_ENGINE debe ser native o docker');
  let admin:Client|undefined;
  try {
    const adminUrl=`postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
    for(let i=0;i<50;i++) {
      const candidate=new Client({connectionString:adminUrl,connectionTimeoutMillis:1000});
      try {await candidate.connect();admin=candidate;break;}
      catch {await candidate.end();await new Promise(resolve=>setTimeout(resolve,200));}
    }
    if(!admin) throw new Error('PostgreSQL no quedó listo');
    await admin.query(await readFile('backend/tests/database/bootstrap.sql','utf8'));
    for(const file of (await readdir('backend/supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
      await admin.query(`begin;\n${await readFile(`backend/supabase/migrations/${file}`,'utf8')}\ncommit;`);
    }
    await admin.query(`create role vexor_backend_test login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '${password}';
      grant vexor_runtime to vexor_backend_test;`);
    return {admin,adminUrl,url:`postgresql://vexor_backend_test:${password}@127.0.0.1:${port}/postgres`,async close(){await admin!.end();await cleanup();}};
  } catch(error) {await admin?.end();await cleanup();throw error;}
}
