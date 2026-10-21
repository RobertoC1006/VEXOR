import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, isAbsolute } from 'node:path';
import { Client } from 'pg';
import supertest from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { startTestDatabase } from './support/postgres.ts';
import { startAuthServer, type TestUser } from './support/auth-server.ts';
import { testConfiguration } from './support/configuration.ts';
import { secureDatabaseUrl } from '../src/compartido/database/database.ts';

const id=(n:number)=>`bc000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const results:string[]=[];
let database:Awaited<ReturnType<typeof startTestDatabase>>|undefined;
let auth:Awaited<ReturnType<typeof startAuthServer>>|undefined;
let app:INestApplication|undefined;
try {
  for(const certificate of ['supabase/certs/prod-ca-2021.crt','backend/supabase/certs/prod-ca-2021.crt']) {
    const normalized=new URL(secureDatabaseUrl(`postgresql://example.invalid/db?sslmode=verify-full&sslrootcert=${certificate}`));
    assert.equal(normalized.searchParams.get('sslrootcert'),'backend/supabase/certs/prod-ca-2021.crt');
    assert.equal(normalized.searchParams.get('sslmode'),'verify-full');
  }
  results.push('Certificado público: rutas anterior y actual conservan TLS verificado');
  database=await startTestDatabase();
  console.log('PostgreSQL desechable listo; aplicadas las migraciones.');
  const users:TestUser[]=Array.from({length:9},(_,i)=>({id:id(i+1),email:`persona${i+1}@example.test`}));
  users[7].confirmed=false;users[8].role='service_role';
  await database.admin.query(`begin;
    insert into auth.users(id) select ('bc000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,9)n;
    insert into app.usuarios(id,auth_user_id,nombre) select
      ('bc000000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,
      ('bc000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Persona '||n from generate_series(1,5)n;
    insert into app.negocios(id,nombre) values('${id(201)}','Negocio A'),('${id(202)}','Negocio B');
    insert into app.miembros_negocio(id,negocio_id,usuario_id,es_propietario) values
      ('${id(301)}','${id(201)}','${id(101)}',true),('${id(302)}','${id(201)}','${id(102)}',false),
      ('${id(303)}','${id(201)}','${id(103)}',false),('${id(304)}','${id(202)}','${id(104)}',true),
      ('${id(305)}','${id(201)}','${id(105)}',true);
    insert into app.locales(id,negocio_id,nombre,habilitado_venta) values
      ('${id(401)}','${id(201)}','Puesto A',true),('${id(402)}','${id(201)}','Almacén A',false),('${id(404)}','${id(202)}','Puesto B',true);
    insert into app.roles(id,negocio_id,nombre) values('${id(501)}','${id(201)}','Vendedor'),('${id(502)}','${id(202)}','Rol B');
    insert into app.roles_permisos(negocio_id,rol_id,permiso_codigo) values('${id(201)}','${id(501)}','locales.ver');
    insert into app.miembros_roles(negocio_id,miembro_id,rol_id) values('${id(201)}','${id(302)}','${id(501)}'),('${id(201)}','${id(303)}','${id(501)}');
    insert into app.miembros_locales(negocio_id,miembro_id,local_id) values('${id(201)}','${id(302)}','${id(401)}'),('${id(201)}','${id(303)}','${id(401)}');
    insert into app_private.administradores_plataforma(auth_user_id) values('${id(6)}');
    commit;`);
  auth=await startAuthServer(database.admin,users);
  const {createApp}=await import(pathToFileURL(resolve('dist/backend/app.factory.js')).href);
  const config={databaseUrl:database.url,databasePoolMax:1,supabaseUrl:auth.url,supabaseKey:'test-publishable',supabaseSecretKey:'test-secret',
    invitationRedirectUrl:'http://localhost:5173/auth/callback',port:0,host:'127.0.0.1',origins:['http://localhost:5173'],production:false};
  app=await createApp(config,true);await app!.listen(0,'127.0.0.1');
  console.log('Backend iniciado con cuenta SQL restringida; verificando HTTP y autenticación.');
  const api=supertest(app!.getHttpServer());
  const tokens=new Map<number,string>();for(let n=1;n<=9;n++)tokens.set(n,await auth.token(id(n)));
  const A=`/api/v1/negocios/${id(201)}`,B=`/api/v1/negocios/${id(202)}`;
  async function request(method:'get'|'post'|'patch'|'put'|'delete',url:string,actor:number|undefined,status:number,body?:object,key?:string) {
    let r=api[method](url);if(actor)r=r.set('Authorization',`Bearer ${tokens.get(actor)}`);if(key)r=r.set('Idempotency-Key',key);if(body!==undefined)r=r.send(body);
    const response=await r;
    assert.equal(response.status,status,`${method.toUpperCase()} ${url}: ${JSON.stringify(response.body)}`);
    assert.ok(response.headers['x-request-id']);
    if(status>=400) assert.ok(!JSON.stringify(response.body).match(/app_private\.|select .* from|postgresql:\/\//i),'No filtrar SQL ni credenciales');
    results.push(`${method.toUpperCase()} ${url} → ${status}`);return response;
  }
  await request('get','/api/v1/health',undefined,200);
  await request('get','/api/v1/health/ready',undefined,200);
  await request('get','/api/v1/me',undefined,401);
  for(const token of ['malformado',await auth.token(id(1),{expired:true}),await auth.token(id(1),{wrongSignature:true}),
    await auth.token(id(1),{issuer:'https://otro.example/auth/v1'}),await auth.token(id(1),{audience:'service_role'})]) {
    await api.get('/api/v1/me').set('Authorization',`Bearer ${token}`).expect(401);results.push('JWT inválido/vencido/firma/issuer/audience rechazado');
  }
  await api.get('/api/v1/me').set('Authorization','Bearer auth-outage').expect(503);results.push('Caída de Auth devuelve 503 y no concede acceso');
  await request('get','/api/v1/me',8,401);await request('get','/api/v1/me',9,401);
  const me=await request('get','/api/v1/me',1,200);assert.equal(me.body.administrador_plataforma,false);
  const admin=await request('get','/api/v1/me',6,200);assert.equal(admin.body.administrador_plataforma,true);
  const own=await request('get','/api/v1/me/negocios',1,200);assert.deepEqual(own.body.items.map((n:any)=>n.negocio_id),[id(201)]);
  await request('get',B,1,403);await request('get',A,7,403);
  await request('get','/api/v1/me/negocios?limit=101',1,400);
  await request('get','/api/v1/negocios/no-es-uuid',1,400);
  await request('patch',A,1,400,{nombre:'Intrusión',negocio_id:id(202)});
  await request('patch',`${A}/miembros/${id(302)}`,2,403,{es_propietario:true});
  const forged=await auth.token(id(2),{metadata:{es_admin:true,role:'admin',negocio_id:id(202)}});
  await api.get('/api/v1/plataforma/invitaciones-negocio').set('Authorization',`Bearer ${forged}`).expect(403);results.push('user_metadata no concede administración');
  const sellerLocals=await request('get',`${A}/locales`,2,200);assert.deepEqual(sellerLocals.body.items.map((l:any)=>l.id),[id(401)]);
  await request('post',`${A}/locales`,2,403,{nombre:'Sin autorización'});
  await request('patch',`${A}/locales/${id(404)}`,1,404,{nombre:'Local ajeno'});
  await request('post',`${A}/locales`,1,409,{nombre:'Segundo puesto activo',habilitado_venta:true});
  const unicodeLocal=await request('post',`${A}/locales`,1,201,{nombre:' Almacén Ñandú 💡 '});assert.equal(unicodeLocal.body.nombre,'Almacén Ñandú 💡');
  await request('patch',`${A}/locales/${id(402)}`,1,200,{nombre:'Almacén actualizado'});
  await request('put',`${A}/miembros/${id(302)}/locales`,1,400,{locales_ids:[id(404)]});
  const keptLocals=await request('get',`${A}/miembros/${id(302)}/locales`,1,200);assert.deepEqual(keptLocals.body.items.map((l:any)=>l.local_id),[id(401)]);
  await request('post',`${A}/miembros/${id(302)}/roles`,1,400,{rol_id:id(502)});
  await request('put',`${A}/roles/${id(501)}/permisos`,1,400,{permisos:['accion.inexistente']});
  const keptPerms=await request('get',`${A}/roles/${id(501)}/permisos`,1,200);assert.equal(keptPerms.body[0].permiso_codigo,'locales.ver');
  const newRole=await request('post',`${A}/roles`,1,201,{nombre:'Encargado de prueba'});
  await request('patch',`${A}/roles/${newRole.body.id}`,1,200,{activo:false});
  await request('patch',`${A}/roles/${id(501)}`,1,200,{activo:false});
  assert.equal((await request('get',`${A}/locales`,2,200)).body.items.length,0);
  await request('patch',`${A}/roles/${id(501)}`,1,200,{activo:true});
  await request('get',`${A}/miembros`,2,403);
  const grant=await request('post',`${A}/miembros/${id(302)}/permisos`,1,201,{permiso_codigo:'equipo.ver',efecto:'permitir'});
  await request('get',`${A}/miembros`,2,200);await request('get',`${A}/miembros`,3,403);
  const deny=await request('post',`${A}/miembros/${id(303)}/permisos`,1,201,{permiso_codigo:'locales.ver',efecto:'denegar',local_id:id(401)});
  const denied=await request('get',`${A}/locales`,3,200);assert.equal(denied.body.items.length,0);
  await request('post',`${A}/miembros/${id(303)}/permisos/${deny.body.id}/revocar`,1,200);
  assert.equal((await request('get',`${A}/locales`,3,200)).body.items.length,1);
  await request('post',`${A}/miembros/${id(302)}/permisos/${grant.body.id}/revocar`,1,200);
  await request('get',`${A}/miembros`,2,403);
  const expired=await request('post',`${A}/miembros/${id(302)}/permisos`,1,201,{permiso_codigo:'equipo.ver',efecto:'permitir',inicia_en:'2020-01-01T00:00:00Z',vence_en:'2020-01-02T00:00:00Z'});
  await request('get',`${A}/miembros`,2,403);
  await request('patch',`${A}/miembros/${id(302)}/permisos/${expired.body.id}`,1,200,{vence_en:new Date(Date.now()+86400000).toISOString()});
  await request('get',`${A}/miembros`,2,200);
  await request('get',`${A}/auditoria`,2,403);
  const audit=await request('get',`${A}/auditoria`,1,200);assert.ok(audit.body.items.some((e:any)=>e.tabla==='permisos_otorgados'));
  await request('patch',`${A}/miembros/${id(302)}`,1,200,{activo:false});await request('get',A,2,403);
  await request('patch',`${A}/miembros/${id(302)}`,1,200,{activo:true});
  await request('patch',`${A}/miembros/${id(305)}`,1,200,{es_propietario:false});
  await request('patch',`${A}/miembros/${id(301)}`,1,409,{activo:false});
  await request('patch',`${A}/miembros/${id(305)}`,1,200,{es_propietario:true});

  // Alta: solicitud durable; correo fuera de la transacción; aceptación atómica.
  const platform='/api/v1/plataforma/invitaciones-negocio';
  const key=randomUUID();const payload={email:'nueva.propietaria@example.test',nombre:'Propietaria nueva',negocio_nombre:'Negocio nuevo'};
  await request('post',platform,1,403,payload,randomUUID());
  await request('post',platform,6,400,payload);
  const before=Number((await database.admin.query('select count(*) from app.negocios')).rows[0].count);
  const created=await request('post',platform,6,202,payload,key);assert.equal(created.body.estado_envio,'enviado',JSON.stringify(created.body));
  assert.equal(Number((await database.admin.query('select count(*) from app.negocios')).rows[0].count),before);
  await request('post',platform,6,202,payload,key);
  assert.equal(auth.delivered.filter(x=>x.email===payload.email).length,1);
  await request('post',platform,6,409,{...payload,nombre:'Otro contenido'},key);
  await request('post',`/api/v1/me/invitaciones/${key}/aceptar`,7,403);
  const invited=[...auth.users.values()].find(u=>u.email===payload.email)!;invited.confirmed=true;
  tokens.set(10,await auth.token(invited.id));
  const pending=await request('get','/api/v1/me/invitaciones',10,200);assert.equal(pending.body.items[0].id,key);
  const accepts=await Promise.all([request('post',`/api/v1/me/invitaciones/${key}/aceptar`,10,200),request('post',`/api/v1/me/invitaciones/${key}/aceptar`,10,200)]);
  assert.deepEqual(accepts[0].body,accepts[1].body);
  const newBusiness=accepts[0].body.negocio_id;
  assert.equal(Number((await database.admin.query('select count(*) from app.negocios')).rows[0].count),before+1);
  const newAccess=await request('get',`/api/v1/negocios/${newBusiness}/acceso`,10,200);assert.equal(newAccess.body.es_propietario,true);
  await request('get',`/api/v1/negocios/${newBusiness}`,6,403);
  await request('post',platform,6,202,payload,key);assert.equal(auth.delivered.filter(x=>x.email===payload.email).length,1);
  const concurrentKey=randomUUID(),concurrentBody={email:'concurrente@example.test',nombre:'Una invitación'};
  await Promise.all([request('post',`${A}/invitaciones`,1,202,concurrentBody,concurrentKey),request('post',`${A}/invitaciones`,1,202,concurrentBody,concurrentKey)]);
  assert.equal(auth.delivered.filter(x=>x.email===concurrentBody.email).length,1);

  const memberKey=randomUUID();const existingPayload={email:users[6].email,nombre:'Trabajador invitado'};
  await request('post',`${A}/invitaciones`,2,403,existingPayload,randomUUID());
  const memberInvite=await request('post',`${A}/invitaciones`,1,202,existingPayload,memberKey);assert.equal(memberInvite.body.estado_envio,'enviado',JSON.stringify(memberInvite.body));
  assert.ok(auth.delivered.some(x=>x.email===existingPayload.email && x.kind==='otp'));
  await request('post',`/api/v1/me/invitaciones/${memberKey}/aceptar`,7,200);
  const memberAccess=await request('get',`${A}/acceso`,7,200);assert.equal(memberAccess.body.es_propietario,false);assert.equal(memberAccess.body.locales.length,0);
  await request('post',`${B}/invitaciones/${memberKey}/reenviar`,4,403);
  const failKey=randomUUID();const failPayload={email:'fallo@example.test',nombre:'Fallo recuperable'};auth.rejected.add(failPayload.email);
  const failed=await request('post',`${A}/invitaciones`,1,202,failPayload,failKey);assert.equal(failed.body.estado_envio,'error');assert.equal(failed.body.error_codigo,'auth_rechazada');
  auth.rejected.delete(failPayload.email);
  const retry=await request('post',`${A}/invitaciones`,1,202,failPayload,failKey);assert.equal(retry.body.estado_envio,'enviado');assert.equal(retry.body.intentos,2);
  const revokedKey=randomUUID();const revokedPayload={email:'revocada@example.test',nombre:'Revocada'};
  await request('post',`${A}/invitaciones`,1,202,revokedPayload,revokedKey);
  await request('post',`${A}/invitaciones/${revokedKey}/revocar`,1,200);
  const revokedUser=[...auth.users.values()].find(u=>u.email===revokedPayload.email)!;revokedUser.confirmed=true;tokens.set(11,await auth.token(revokedUser.id));
  await request('post',`/api/v1/me/invitaciones/${revokedKey}/aceptar`,11,409);
  const expiredKey=randomUUID();await request('post',`${A}/invitaciones`,1,202,{email:users[7].email,nombre:'Vencida'},expiredKey);
  await database.admin.query("update app_private.invitaciones_acceso set creado_en=now()-interval '10 days',vence_en=now()-interval '1 day' where id=$1",[expiredKey]);
  users[7].confirmed=true;tokens.set(8,await auth.token(id(8)));
  await request('post',`/api/v1/me/invitaciones/${expiredKey}/aceptar`,8,409);
  await request('post',`${A}/invitaciones/${expiredKey}/revocar`,1,200);
  const staleKey=randomUUID();await request('post',`${A}/invitaciones`,1,202,{email:users[7].email,nombre:'Invitante revocado'},staleKey);
  await request('patch',`${A}/miembros/${id(301)}`,5,200,{activo:false});
  await request('post',`/api/v1/me/invitaciones/${staleKey}/aceptar`,8,403);
  await request('patch',`${A}/miembros/${id(301)}`,5,200,{activo:true});

  await testConfiguration(request,id);

  await api.get('/api/v1/me').set('Authorization',`Bearer ${tokens.get(1)}`).set('Origin','https://malicioso.example').expect(403);results.push('CORS rechaza origen ajeno');
  await api.get('/api/v1/me').set('Authorization',`Bearer ${tokens.get(1)}`).set('Origin','http://localhost:5173').expect('Access-Control-Allow-Origin','http://localhost:5173').expect(200);results.push('CORS acepta origen configurado');
  await api.patch(A).set('Authorization',`Bearer ${tokens.get(1)}`).send({nombre:'a'.repeat(40000)}).expect(413);results.push('Tamaño de cuerpo limitado');
  const contract=await api.get('/docs-json').expect(200);results.push('Contrato OpenAPI generado');
  await mkdir('docs/api',{recursive:true});await writeFile('docs/api/openapi.json',JSON.stringify(contract.body,null,2)+'\n');
  const unsafe=await createApp({...config,databaseUrl:database.adminUrl},true);
  try {await assert.rejects(()=>unsafe.init(),/privilegiada rechazada/);results.push('Arranque rechaza conexión administrativa');}
  finally {await unsafe.close();}
  await database.admin.query('create role privilegio_adicional nologin; grant privilegio_adicional to vexor_backend_test');
  const extra=await createApp(config,true);
  try {await assert.rejects(()=>extra.init(),/privilegiada rechazada/);results.push('Arranque rechaza membresías SQL adicionales');}
  finally {await extra.close();}
  // Aprovisionamiento administrativo probado solo en una carpeta y base desechables.
  const root=resolve('test-results');await mkdir(root,{recursive:true});
  const provisionDir=await mkdtemp(resolve(root,'provision-api-'));
  const rel=relative(root,provisionDir);
  if(rel.startsWith('..') || isAbsolute(rel) || !rel.startsWith('provision-api-'))throw new Error('Ruta de prueba insegura');
  try {
    const cli=spawnSync(process.execPath,['--import','tsx',resolve('backend/scripts/provision-runtime.ts')],{cwd:provisionDir,encoding:'utf8',
      env:{...process.env,VEXOR_PROVISION_TARGET:'development',MIGRATION_DATABASE_URL:database.adminUrl},timeout:15000});
    assert.equal(cli.status,0,cli.stderr);
    const runtimeFile=await readFile(resolve(provisionDir,'.env.runtime'),'utf8');
    const runtimeUrl=runtimeFile.split('\n').find(l=>l.startsWith('DATABASE_URL='))!.slice('DATABASE_URL='.length);
    assert.ok(!cli.stdout.includes(runtimeUrl) && !cli.stdout.includes(new URL(runtimeUrl).password));
    const login=new Client({connectionString:runtimeUrl});await login.connect();
    try {assert.equal((await login.query('select current_user')).rows[0].current_user,'vexor_backend');}finally {await login.end();}
    const duplicate=spawnSync(process.execPath,['--import','tsx',resolve('backend/scripts/provision-runtime.ts')],{cwd:provisionDir,encoding:'utf8',
      env:{...process.env,VEXOR_PROVISION_TARGET:'development',MIGRATION_DATABASE_URL:database.adminUrl},timeout:15000});
    assert.notEqual(duplicate.status,0);assert.equal(await readFile(resolve(provisionDir,'.env.runtime'),'utf8'),runtimeFile);
    results.push('CLI crea cuenta restringida, guarda secreto local y rechaza reemplazar credenciales');
    const bootstrap=spawnSync(process.execPath,['--import','tsx',resolve('backend/scripts/bootstrap-platform-admin.ts'),id(6)],{cwd:provisionDir,encoding:'utf8',
      env:{...process.env,VEXOR_PROVISION_TARGET:'development',MIGRATION_DATABASE_URL:database.adminUrl},timeout:15000});
    assert.equal(bootstrap.status,0,bootstrap.stderr);results.push('Bootstrap administrativo idempotente sin membresía comercial');
  } finally {await rm(provisionDir,{recursive:true,force:true});}
  await mkdir('test-results',{recursive:true});
  await writeFile('test-results/backend-api.json',JSON.stringify({at:new Date().toISOString(),database:(await database.admin.query('select version()')).rows[0].version,
    total:results.length,results,auth:'Servidor Auth local controlado; JWT RS256 reales; ningún correo real enviado'},null,2));
  console.log(`${results.length} comprobaciones HTTP/integración correctas. PostgreSQL real, cuenta restringida, pool de una conexión y Auth simulado con JWT firmados.`);
} catch(error:any) {console.error(error.message);process.exitCode=1;
} finally {await app?.close();await auth?.close();await database?.close();}
// El runner nativo instala un beforeExit propio; preservar el fallo después de limpiar.
if(process.exitCode) process.exit(process.exitCode);
