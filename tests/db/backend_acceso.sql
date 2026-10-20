begin;
create temporary table backend_resultados (resultado text);
alter table backend_resultados enable row level security;
create policy backend_resultados_runtime on backend_resultados to vexor_runtime using(true) with check(true);
grant insert,select on backend_resultados to vexor_runtime;
create temporary table backend_ids (clave text primary key, valor uuid);
alter table backend_ids enable row level security;
create policy backend_ids_runtime on backend_ids to vexor_runtime using(true) with check(true);
grant insert,select on backend_ids to vexor_runtime;
create function pg_temp.id(n integer) returns uuid language sql immutable as $$
  select ('bd000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.ok(v boolean,m text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'FALLO: %',m;end if;
  insert into pg_temp.backend_resultados values('OK: '||m);end $$;
create function pg_temp.falla(q text,c text,m text) returns void language plpgsql as $$
declare recibido text;begin begin execute q;exception when others then get stacked diagnostics recibido=returned_sqlstate;end;
  perform pg_temp.ok(recibido=c,m||coalesce(' ['||recibido||']',' [sin error]'));end $$;
insert into auth.users(id) select pg_temp.id(n) from generate_series(1,4)n;
insert into app_private.administradores_plataforma(auth_user_id) values(pg_temp.id(1));

set local role vexor_runtime;
select set_config('vexor.actor_id',pg_temp.id(1)::text,true),set_config('vexor.actor_email','admin@example.test',true),set_config('vexor.negocio_id','',true);
select pg_temp.ok(app_private.es_admin_plataforma(),'Administrador explícito reconocido');
select pg_temp.falla('select * from app_private.administradores_plataforma','42501','Runtime no consulta administradores privados');
select pg_temp.falla('select * from app_private.invitaciones_acceso','42501','Runtime no consulta invitaciones privadas');
select app_private.solicitar_invitacion(pg_temp.id(901),null,'owner@example.test','Propietario','Nuevo negocio','America/Lima');
select pg_temp.ok(app_private.solicitar_invitacion(pg_temp.id(901),null,'owner@example.test','Propietario','Nuevo negocio','America/Lima')=pg_temp.id(901),'Solicitud idempotente');
select pg_temp.falla($q$select app_private.solicitar_invitacion(pg_temp.id(901),null,'otro@example.test','Propietario','Nuevo negocio','America/Lima')$q$,'23505','Clave no admite otro contenido');
select pg_temp.ok((select count(*)=1 from app_private.invitaciones_gestionables() where id=pg_temp.id(901)),'Alta pendiente accesible solo en plataforma');
insert into backend_ids select 'lease',lease from app_private.reservar_envio(pg_temp.id(901));
select pg_temp.ok((select count(*)=0 from app_private.reservar_envio(pg_temp.id(901))),'Lease impide envíos concurrentes');
select pg_temp.ok(not app_private.finalizar_envio(pg_temp.id(901),pg_temp.id(999)),'Lease incorrecto no finaliza envío');
select pg_temp.ok(app_private.finalizar_envio(pg_temp.id(901),(select valor from backend_ids where clave='lease')),'Emisor finaliza con lease correcto');
select pg_temp.ok((select count(*)=0 from app_private.reservar_envio(pg_temp.id(901))),'Reintento normal no reenvía correo');

select set_config('vexor.actor_id',pg_temp.id(3)::text,true),set_config('vexor.actor_email','intruso@example.test',true);
select pg_temp.ok(not app_private.es_admin_plataforma(),'Otro usuario no hereda administración');
select pg_temp.falla($q$select app_private.aceptar_invitacion(pg_temp.id(901))$q$,'42501','Otro correo no acepta invitación');
select pg_temp.falla($q$select app_private.solicitar_invitacion(pg_temp.id(909),null,'intruso@example.test','Intruso','Otro negocio','America/Lima')$q$,'42501','Usuario comercial no aprovisiona negocios');

select set_config('vexor.actor_id',pg_temp.id(2)::text,true),set_config('vexor.actor_email','owner@example.test',true);
select pg_temp.ok((select count(*)=1 from app_private.mis_invitaciones() where id=pg_temp.id(901)),'Destinatario consulta pendiente');
insert into backend_ids select 'negocio',negocio_id from app_private.aceptar_invitacion(pg_temp.id(901));
select set_config('vexor.negocio_id',(select valor::text from backend_ids where clave='negocio'),true);
select pg_temp.ok(app_private.es_propietario(),'Aceptación crea propietario y negocio juntos');
select pg_temp.ok((select count(*)=1 from app_private.mis_negocios()),'Listado propio descubre membresía sin tenant previo');
select pg_temp.ok((select negocio_id=(select valor from backend_ids where clave='negocio') from app_private.aceptar_invitacion(pg_temp.id(901))),'Aceptar otra vez devuelve mismo negocio');
select app_private.solicitar_invitacion(pg_temp.id(902),(select valor from backend_ids where clave='negocio'),'worker@example.test','Trabajador');
select app_private.solicitar_invitacion(pg_temp.id(903),(select valor from backend_ids where clave='negocio'),'cancel@example.test','Revocada');
select app_private.revocar_invitacion(pg_temp.id(903));

select set_config('vexor.actor_id',pg_temp.id(3)::text,true),set_config('vexor.actor_email','worker@example.test',true),set_config('vexor.negocio_id','',true);
select pg_temp.ok((select count(*)=0 from app_private.invitaciones_gestionables()),'Trabajador no enumera invitaciones ajenas');
select app_private.aceptar_invitacion(pg_temp.id(902));
select set_config('vexor.negocio_id',(select valor::text from backend_ids where clave='negocio'),true);
select pg_temp.ok(app_private.miembro_actual() is not null and not app_private.es_propietario(),'Invitación de equipo crea trabajador sin propiedad');
select pg_temp.ok((select count(*)=0 from app.locales),'Trabajador nuevo no tiene locales implícitos');
select pg_temp.falla($q$select app_private.reservar_envio(pg_temp.id(901),true)$q$,'42501','Miembro no reenvía invitación administrativa');

select set_config('vexor.actor_id',pg_temp.id(4)::text,true),set_config('vexor.actor_email','cancel@example.test',true),set_config('vexor.negocio_id','',true);
select pg_temp.falla($q$select app_private.aceptar_invitacion(pg_temp.id(903))$q$,'23514','Invitación revocada no crea acceso');
select set_config('vexor.actor_id',pg_temp.id(1)::text,true),set_config('vexor.actor_email','admin@example.test',true),set_config('vexor.negocio_id',(select valor::text from backend_ids where clave='negocio'),true);
select pg_temp.ok(app_private.miembro_actual() is null,'Administrador no recibe acceso comercial al alta');
select count(*)::text||' comprobaciones de invitaciones OK' as resultado from backend_resultados;
rollback;
