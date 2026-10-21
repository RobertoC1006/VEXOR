-- Suite compartida por PostgreSQL 17, PGlite y Supabase desarrollo.
-- Toda la preparación, pruebas y auditoría ficticia se deshacen al finalizar.
begin;
create temporary table resultados (numero bigint generated always as identity, resultado text);
alter table resultados enable row level security;
alter table resultados force row level security;
create policy resultados_pruebas on resultados for all to vexor_runtime using (true) with check (true);
grant select, insert on resultados to vexor_runtime;
grant usage on sequence resultados_numero_seq to vexor_runtime;
create function pg_temp.id(n integer) returns uuid language sql immutable as $$
  select ('ac000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;
create function pg_temp.ok(condicion boolean, mensaje text) returns void language plpgsql as $$
begin
  if condicion is distinct from true then raise exception 'FALLO: %', mensaje; end if;
  insert into pg_temp.resultados(resultado) values ('OK: ' || mensaje);
end $$;
create function pg_temp.falla(consulta text, estado text, mensaje text) returns void language plpgsql as $$
declare recibido text;
begin
  begin execute consulta;
  exception when others then get stacked diagnostics recibido = returned_sqlstate; end;
  perform pg_temp.ok(recibido = estado, mensaje || coalesce(' [' || recibido || ']', ' [no falló]'));
end $$;

insert into auth.users(id) select pg_temp.id(n) from generate_series(1,5) n;
insert into app.usuarios(id, auth_user_id, nombre) select pg_temp.id(100+n), pg_temp.id(n), 'Persona de prueba '||n from generate_series(1,5) n;
insert into app.negocios(id,nombre) values (pg_temp.id(201),'Negocio prueba A'), (pg_temp.id(202),'Negocio prueba B');
insert into app.miembros_negocio(id,negocio_id,usuario_id,es_propietario) values
  (pg_temp.id(301),pg_temp.id(201),pg_temp.id(101),true),
  (pg_temp.id(302),pg_temp.id(201),pg_temp.id(102),false),
  (pg_temp.id(303),pg_temp.id(201),pg_temp.id(103),false),
  (pg_temp.id(304),pg_temp.id(202),pg_temp.id(104),true),
  (pg_temp.id(305),pg_temp.id(201),pg_temp.id(105),true),
  (pg_temp.id(306),pg_temp.id(202),pg_temp.id(102),false);
insert into app.locales(id,negocio_id,nombre,habilitado_venta,activo) values
  (pg_temp.id(401),pg_temp.id(201),'Puesto A',true,true),
  (pg_temp.id(402),pg_temp.id(201),'Almacén A',false,true),
  (pg_temp.id(403),pg_temp.id(201),'Puesto inactivo A',true,false),
  (pg_temp.id(404),pg_temp.id(202),'Puesto B',true,true),
  (pg_temp.id(405),pg_temp.id(202),'Almacén B',false,true);
insert into app.roles(id,negocio_id,nombre) values (pg_temp.id(501),pg_temp.id(201),'Vendedor de prueba'), (pg_temp.id(502),pg_temp.id(202),'Rol B');
insert into app.roles_permisos(negocio_id,rol_id,permiso_codigo) values (pg_temp.id(201),pg_temp.id(501),'locales.ver');
insert into app.miembros_roles(negocio_id,miembro_id,rol_id) values
  (pg_temp.id(201),pg_temp.id(302),pg_temp.id(501)), (pg_temp.id(201),pg_temp.id(303),pg_temp.id(501));
insert into app.miembros_locales(negocio_id,miembro_id,local_id) values
  (pg_temp.id(201),pg_temp.id(302),pg_temp.id(401)), (pg_temp.id(201),pg_temp.id(303),pg_temp.id(401));
set constraints all immediate;
set constraints all deferred;

select pg_temp.ok((select count(*)=11 from pg_tables where schemaname='app' and tablename = any(array[
  'usuarios','negocios','miembros_negocio','locales','roles','permisos','roles_permisos',
  'miembros_roles','miembros_locales','permisos_otorgados','auditoria_acceso'])), 'Se conservan las once tablas del núcleo');
select pg_temp.ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class join pg_namespace ns on ns.oid=relnamespace where ns.nspname='app' and relkind='r'), 'RLS habilitado y forzado en todas las tablas');
select pg_temp.ok((select not rolbypassrls and not rolsuper and not rolcanlogin and not rolcreaterole from pg_roles where rolname='vexor_runtime'), 'Runtime sin login, superusuario ni BYPASSRLS');
select pg_temp.ok(not has_schema_privilege('anon','app','USAGE') and not has_schema_privilege('authenticated','app','USAGE') and not has_schema_privilege('service_role','app','USAGE'), 'Roles de la API sin acceso al esquema');
select pg_temp.ok(not has_function_privilege('authenticated','app_private.puede(text,uuid)','EXECUTE'), 'La API no ejecuta helpers privados');
select pg_temp.falla($q$insert into app.miembros_locales values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(404),default)$q$, '23503', 'FK impide asignar local de otro negocio');
select pg_temp.falla($q$insert into app.miembros_roles(negocio_id,miembro_id,rol_id) values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(502))$q$, '23503', 'FK impide asignar rol de otro negocio');
select pg_temp.falla($q$insert into app.roles_permisos values(pg_temp.id(202),pg_temp.id(501),'equipo.ver',default)$q$, '23503', 'FK protege puente de permisos');
select pg_temp.falla($q$insert into app.miembros_roles(negocio_id,miembro_id,rol_id,local_id) values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(501),pg_temp.id(404))$q$, '23503', 'FK protege alcance local de rol');
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id,local_id) values(pg_temp.id(201),pg_temp.id(302),'locales.ver','permitir',pg_temp.id(301),pg_temp.id(404))$q$, '23503', 'FK protege alcance local de permiso individual');
select pg_temp.falla($q$insert into app.miembros_roles(negocio_id,miembro_id,rol_id) values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(501))$q$, '23505', 'Asignación global duplicada prohibida aun con NULL');
select pg_temp.falla($q$insert into app.locales(negocio_id,nombre,habilitado_venta) values(pg_temp.id(201),'Segundo puesto activo',true)$q$, '23505', 'Plan básico impide segundo puesto activo');
select pg_temp.falla($q$update app.negocios set zona_horaria='Inventada/NoExiste' where id=pg_temp.id(201)$q$, '23514', 'Zona horaria debe existir');
select pg_temp.falla($q$update app.locales set negocio_id=pg_temp.id(202) where id=pg_temp.id(402)$q$, '23514', 'Local no se traslada a otro negocio');
select pg_temp.falla($q$update app.miembros_negocio set usuario_id=pg_temp.id(104) where id=pg_temp.id(302)$q$, '23514', 'Identidad de miembro inmutable');
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id) values(pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(304))$q$, '23514', 'Otorgante no puede pertenecer a otro negocio');
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id,local_id) values(pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(301),pg_temp.id(401))$q$, '23514', 'Permiso de negocio no admite local');
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id,inicia_en,vence_en) values(pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(301),now(),now()-interval '1 second')$q$, '23514', 'Intervalo temporal inválido rechazado');
select pg_temp.falla($q$delete from app.usuarios where id=pg_temp.id(102)$q$, '23503', 'Identidades referenciadas conservan historial');

set local role vexor_runtime;
select pg_temp.ok((select count(*)=0 from app.negocios), 'Sin contexto no hay negocios');
select pg_temp.ok(not app_private.puede('equipo.ver'), 'Sin contexto no hay permisos');
select set_config('vexor.actor_id',pg_temp.id(1)::text,true), set_config('vexor.negocio_id',pg_temp.id(201)::text,true);
select pg_temp.ok((select count(*)=1 from app.negocios), 'Propietario A solo ve negocio A');
select pg_temp.ok((select count(*)=3 from app.locales), 'Propietario ve todos sus locales incluidos inactivos');
select pg_temp.ok((select count(*)=0 from app.usuarios where id=pg_temp.id(104)), 'No se filtran perfiles de otro negocio');
select pg_temp.ok(app_private.puede('locales.ver',pg_temp.id(402)), 'Propietario accede sin asignación local');
select pg_temp.ok(not app_private.puede('locales.ver',pg_temp.id(404)), 'Propietario no accede al local de otro negocio');
select pg_temp.ok(not app_private.puede('no.existe'), 'Acción inexistente se deniega incluso al propietario');
select pg_temp.ok(not app_private.puede('equipo.ver',pg_temp.id(401)) and not app_private.puede('locales.ver'), 'Permisos exigen el tipo correcto de alcance');
select pg_temp.falla($q$insert into app.locales(negocio_id,nombre) values(pg_temp.id(202),'Intrusión')$q$, '42501', 'RLS rechaza INSERT de otro negocio');
with cambio as (update app.locales set nombre='Intrusión' where id=pg_temp.id(405) returning id)
select pg_temp.ok((select count(*)=0 from cambio), 'UPDATE de otro negocio no modifica filas');
with cambio as (delete from app.miembros_locales where negocio_id=pg_temp.id(202) returning local_id)
select pg_temp.ok((select count(*)=0 from cambio), 'DELETE de otro negocio no modifica puentes');
select pg_temp.falla($q$delete from app.negocios where id=pg_temp.id(201)$q$, '42501', 'Runtime no borra negocios');
select pg_temp.falla($q$update app.negocios set activo=false where id=pg_temp.id(201)$q$, '42501', 'Runtime no cambia estado del servicio');
select pg_temp.falla($q$update app.usuarios set auth_user_id=pg_temp.id(4) where id=pg_temp.id(101)$q$, '42501', 'Runtime no cambia identidad Auth');
select pg_temp.falla($q$insert into app.permisos(codigo,alcance,descripcion) values('inventado.accion','negocio','No autorizada')$q$, '42501', 'Propietario no inventa acciones del backend');

insert into app.permisos_otorgados(id,negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id)
values (pg_temp.id(701),pg_temp.id(201),pg_temp.id(302),'negocio.editar','permitir',pg_temp.id(301));
insert into app.permisos_otorgados(id,negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id,local_id)
values (pg_temp.id(702),pg_temp.id(201),pg_temp.id(303),'locales.ver','denegar',pg_temp.id(301),pg_temp.id(401));
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id) values(pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(305))$q$, '42501', 'No se suplanta al copropietario otorgante');

select set_config('vexor.actor_id',pg_temp.id(2)::text,true);
select pg_temp.ok(app_private.puede('negocio.editar'), 'Concesión individual añade permiso al vendedor 1');
select pg_temp.ok(app_private.puede('locales.ver',pg_temp.id(401)), 'Vendedor 1 conserva permiso del rol');
select pg_temp.ok(not app_private.puede('locales.ver',pg_temp.id(402)), 'Rol no reemplaza asignación explícita de locales');
select pg_temp.ok((select count(*)=1 from app.locales), 'RLS filtra locales no asignados');
select pg_temp.ok((select count(*)=1 from app.miembros_negocio), 'Vendedor sin equipo.ver solo ve su membresía');
select pg_temp.ok((select count(*)=0 from app.auditoria_acceso), 'Vendedor no lee auditoría de acceso');
select pg_temp.falla($q$insert into app.miembros_roles(negocio_id,miembro_id,rol_id) values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(501))$q$, '42501', 'Vendedor no se autoasigna roles');
with cambio as (update app.miembros_negocio set es_propietario=true where id=pg_temp.id(302) returning id)
select pg_temp.ok((select count(*)=0 from cambio), 'Vendedor no se convierte en propietario');
select pg_temp.falla($q$insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id) values(pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(302))$q$, '42501', 'Vendedor no se concede permisos');
select pg_temp.falla($q$insert into app.miembros_locales values(pg_temp.id(201),pg_temp.id(302),pg_temp.id(402),default)$q$, '42501', 'Vendedor no se autoasigna locales');
select set_config('vexor.negocio_id',pg_temp.id(202)::text,true);
select pg_temp.ok((select count(*)=1 from app.negocios), 'Usuario multinegocio puede seleccionar su otra membresía');
select pg_temp.ok((select count(*)=0 from app.locales), 'Otra membresía no hereda roles ni locales de A');
select pg_temp.ok(not app_private.puede('negocio.editar'), 'Concesión A no se filtra a B');
select set_config('vexor.actor_id',pg_temp.id(3)::text,true), set_config('vexor.negocio_id',pg_temp.id(201)::text,true);
select pg_temp.ok(not app_private.puede('negocio.editar'), 'Mismo rol no hereda concesión de otra persona');
select pg_temp.ok(not app_private.puede('locales.ver',pg_temp.id(401)), 'Denegación individual quita permiso del rol');
select pg_temp.ok((select count(*)=0 from app.locales), 'Denegación efectiva también se aplica en RLS');
select set_config('vexor.negocio_id',pg_temp.id(202)::text,true);
select pg_temp.ok((select count(*)=0 from app.negocios), 'Cambiar tenant sin membresía no da acceso');
select pg_temp.ok((select count(*)=0 from app.permisos), 'Sin membresía no se consulta catálogo de acciones');

select set_config('vexor.actor_id',pg_temp.id(1)::text,true), set_config('vexor.negocio_id',pg_temp.id(201)::text,true);
update app.permisos_otorgados set revocado_en=clock_timestamp() where id=pg_temp.id(701);
select set_config('vexor.actor_id',pg_temp.id(2)::text,true);
select pg_temp.ok(not app_private.puede('negocio.editar'), 'Revocación elimina concesión sin esperar tarea programada');
select set_config('vexor.actor_id',pg_temp.id(1)::text,true);
update app.permisos_otorgados set revocado_en=clock_timestamp() where id=pg_temp.id(702);
select set_config('vexor.actor_id',pg_temp.id(3)::text,true);
select pg_temp.ok(app_private.puede('locales.ver',pg_temp.id(401)), 'Revocar denegación restaura permiso del rol');

reset role;
insert into app.permisos_otorgados(id,negocio_id,miembro_id,permiso_codigo,efecto,otorgante_id,inicia_en,vence_en) values
  (pg_temp.id(703),pg_temp.id(201),pg_temp.id(302),'equipo.ver','permitir',pg_temp.id(301),now()-interval '2 days',now()-interval '1 day'),
  (pg_temp.id(704),pg_temp.id(201),pg_temp.id(302),'negocio.editar','permitir',pg_temp.id(301),now()+interval '1 day',null);
set local role vexor_runtime;
select set_config('vexor.actor_id',pg_temp.id(2)::text,true);
select pg_temp.ok(not app_private.puede('equipo.ver'), 'Concesión vencida no autoriza');
select pg_temp.ok(not app_private.puede('negocio.editar'), 'Concesión futura no autoriza');
select set_config('vexor.actor_id',pg_temp.id(1)::text,true);
update app.permisos_otorgados set vence_en=clock_timestamp()+interval '1 day' where id=pg_temp.id(703);
select set_config('vexor.actor_id',pg_temp.id(2)::text,true);
select pg_temp.ok(app_private.puede('equipo.ver'), 'Propietario puede editar vencimiento');
select set_config('vexor.actor_id',pg_temp.id(5)::text,true);
select pg_temp.ok(app_private.es_propietario(), 'Copropietario tiene acceso de propietario');
select pg_temp.ok((select count(*)>0 from app.auditoria_acceso where tabla='permisos_otorgados' and operacion='UPDATE' and actor_auth_id=pg_temp.id(1)), 'Cambios y revocaciones conservan autor y valores anteriores');
select pg_temp.falla($q$delete from app.auditoria_acceso$q$, '42501', 'Runtime no borra auditoría');
select pg_temp.falla($q$insert into app.auditoria_acceso(negocio_id,actor_sql,tabla,operacion) values(pg_temp.id(201),'falso','roles','UPDATE')$q$, '42501', 'Runtime no falsifica auditoría');
select pg_temp.falla($q$delete from app.permisos_otorgados where id=pg_temp.id(701)$q$, '42501', 'Revocación preserva historial de concesiones');

reset role;
update app.miembros_negocio set activo=false where id=pg_temp.id(302);
set local role vexor_runtime;
select set_config('vexor.actor_id',pg_temp.id(2)::text,true);
select pg_temp.ok((select count(*)=0 from app.negocios) and not app_private.puede('equipo.ver'), 'Membresía inactiva pierde acceso y concesiones');
reset role;
update app.miembros_negocio set activo=true where id=pg_temp.id(302);
update app.usuarios set activo=false where id=pg_temp.id(102);
set local role vexor_runtime;
select pg_temp.ok(not app_private.puede('locales.ver',pg_temp.id(401)), 'Usuario desactivado no opera');
reset role;
update app.usuarios set activo=true where id=pg_temp.id(102);
update app.negocios set activo=false where id=pg_temp.id(201);
set local role vexor_runtime;
select pg_temp.ok((select count(*)=0 from app.locales), 'Negocio suspendido no expone datos');
reset role;
update app.negocios set activo=true where id=pg_temp.id(201);

-- El control diferido permite transferir propiedad en una transacción, pero no perderla.
update app.miembros_negocio set es_propietario=false where id=pg_temp.id(301);
set constraints all immediate;
select pg_temp.ok((select count(*)=1 from app.miembros_negocio where negocio_id=pg_temp.id(201) and es_propietario and activo), 'Copropietario permite retirar a otro propietario');
set local role vexor_runtime;
select set_config('vexor.actor_id',pg_temp.id(5)::text,true);
update app.permisos_otorgados set revocado_en=clock_timestamp() where id=pg_temp.id(703);
select pg_temp.ok((select revocado_en is not null from app.permisos_otorgados where id=pg_temp.id(703)), 'Otro propietario revoca concesión aunque su otorgante ya no sea propietario');
reset role;
set constraints all deferred;
select pg_temp.falla($q$do $b$ begin
  update app.miembros_negocio set activo=false where id=pg_temp.id(305);
  set constraints all immediate;
end $b$$q$, '23514', 'No se puede desactivar al último propietario');
select pg_temp.falla($q$do $b$ begin
  insert into app.negocios(nombre) values('Sin propietario');
  set constraints all immediate;
end $b$$q$, '23514', 'No se confirma un negocio sin propietario');

-- Cambio de transacción en la misma conexión: contexto LOCAL desaparece.
select count(*)::text || ' comprobaciones OK' as resultado from resultados;
rollback;
begin;
set local role vexor_runtime;
do $$ begin
  if nullif(current_setting('vexor.actor_id',true),'') is not null
    or nullif(current_setting('vexor.negocio_id',true),'') is not null
    or exists(select 1 from app.negocios) then raise exception 'Fuga de contexto en conexión reutilizada'; end if;
end $$;
select 'OK: sin fuga de contexto al reutilizar conexión' as resultado;
rollback;
