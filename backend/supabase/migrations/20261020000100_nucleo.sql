-- Núcleo VEXOR. PostgreSQL >= 17. Ejecutar como administrador de migraciones.
-- El rol runtime NO identifica al usuario: NestJS valida el JWT y fija contexto LOCAL.
create role vexor_runtime nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create schema app;
create schema app_private;
revoke all on schema app, app_private from public, anon, authenticated, service_role;
grant usage on schema app, app_private to vexor_runtime;
alter default privileges in schema app, app_private revoke execute on functions from public;
alter default privileges in schema app, app_private revoke all on tables from public, anon, authenticated, service_role;

create table app.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  activo boolean not null default true,
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp()
);
create table app.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 160),
  activo boolean not null default true,
  zona_horaria text not null default 'America/Lima',
  version bigint not null default 1 check (version > 0),
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp()
);
create table app.miembros_negocio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id) on delete restrict,
  usuario_id uuid not null references app.usuarios(id) on delete restrict,
  es_propietario boolean not null default false,
  activo boolean not null default true,
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id),
  unique (negocio_id, usuario_id)
);
create index miembros_por_usuario on app.miembros_negocio(usuario_id, negocio_id) where activo;
create index propietarios_activos on app.miembros_negocio(negocio_id) where activo and es_propietario;

create table app.locales (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id) on delete restrict,
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  habilitado_venta boolean not null default false,
  activo boolean not null default true,
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id)
);
-- Único plan habilitado: un puesto activo de venta; sin tope inventado de almacenes.
create unique index un_puesto_activo_basico on app.locales(negocio_id) where activo and habilitado_venta;
create table app.roles (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id) on delete restrict,
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  activo boolean not null default true,
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id)
);
create unique index roles_nombre on app.roles(negocio_id, lower(btrim(nombre)));
create table app.permisos (
  codigo text primary key check (codigo ~ '^[a-z_]+\.[a-z_]+$'),
  alcance text not null check (alcance in ('negocio', 'local')),
  descripcion text not null
);
insert into app.permisos(codigo, alcance, descripcion) values
  ('negocio.editar', 'negocio', 'Editar nombre y zona horaria'),
  ('equipo.ver', 'negocio', 'Consultar miembros y configuración de acceso'),
  ('locales.ver', 'local', 'Consultar un local autorizado'),
  ('locales.gestionar', 'negocio', 'Crear y editar locales');

create table app.roles_permisos (
  negocio_id uuid not null,
  rol_id uuid not null,
  permiso_codigo text not null references app.permisos(codigo) on delete restrict,
  creado_en timestamptz not null default clock_timestamp(),
  primary key (negocio_id, rol_id, permiso_codigo),
  foreign key (negocio_id, rol_id) references app.roles(negocio_id, id) on delete restrict
);
create table app.miembros_roles (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  miembro_id uuid not null,
  rol_id uuid not null,
  local_id uuid,
  creado_en timestamptz not null default clock_timestamp(),
  foreign key (negocio_id, miembro_id) references app.miembros_negocio(negocio_id, id) on delete restrict,
  foreign key (negocio_id, rol_id) references app.roles(negocio_id, id) on delete restrict,
  foreign key (negocio_id, local_id) references app.locales(negocio_id, id) on delete restrict,
  unique nulls not distinct (negocio_id, miembro_id, rol_id, local_id)
);
create index miembros_roles_rol on app.miembros_roles(negocio_id, rol_id);
create index miembros_roles_local on app.miembros_roles(negocio_id, local_id) where local_id is not null;
create table app.miembros_locales (
  negocio_id uuid not null,
  miembro_id uuid not null,
  local_id uuid not null,
  creado_en timestamptz not null default clock_timestamp(),
  primary key (negocio_id, miembro_id, local_id),
  foreign key (negocio_id, miembro_id) references app.miembros_negocio(negocio_id, id) on delete restrict,
  foreign key (negocio_id, local_id) references app.locales(negocio_id, id) on delete restrict
);
create index miembros_locales_local on app.miembros_locales(negocio_id, local_id);

create table app.permisos_otorgados (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  miembro_id uuid not null,
  permiso_codigo text not null references app.permisos(codigo) on delete restrict,
  efecto text not null check (efecto in ('permitir', 'denegar')),
  local_id uuid,
  inicia_en timestamptz not null default clock_timestamp(),
  vence_en timestamptz,
  revocado_en timestamptz,
  otorgante_id uuid not null,
  motivo text check (length(motivo) <= 500),
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id),
  foreign key (negocio_id, miembro_id) references app.miembros_negocio(negocio_id, id) on delete restrict,
  foreign key (negocio_id, otorgante_id) references app.miembros_negocio(negocio_id, id) on delete restrict,
  foreign key (negocio_id, local_id) references app.locales(negocio_id, id) on delete restrict,
  check (vence_en is null or vence_en > inicia_en),
  check (isfinite(inicia_en) and (vence_en is null or isfinite(vence_en))),
  check (revocado_en is null or isfinite(revocado_en))
);
create index permisos_vigencia on app.permisos_otorgados(negocio_id, miembro_id, permiso_codigo, local_id) where revocado_en is null;
create index permisos_otorgante on app.permisos_otorgados(negocio_id, otorgante_id);
create index permisos_local on app.permisos_otorgados(negocio_id, local_id) where local_id is not null;

-- Auditoría acotada al núcleo: no implementa todavía la auditoría comercial global.
create table app.auditoria_acceso (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id) on delete restrict,
  actor_auth_id uuid,
  actor_sql text not null,
  tabla text not null,
  operacion text not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  anterior jsonb,
  nuevo jsonb,
  ocurrido_en timestamptz not null default clock_timestamp()
);
create index auditoria_por_negocio on app.auditoria_acceso(negocio_id, ocurrido_en, id);

create function app_private.actor_id() returns uuid language sql stable
set search_path = '' as $$
  select nullif(current_setting('vexor.actor_id', true), '')::uuid
$$;
create function app_private.negocio_id() returns uuid language sql stable
set search_path = '' as $$
  select nullif(current_setting('vexor.negocio_id', true), '')::uuid
$$;

-- Definers deliberadamente pequeños, sin SQL dinámico ni parámetros de actor.
-- Su propietario de migración debe omitir RLS para evitar recursión de políticas.
create function app_private.miembro_actual() returns uuid language sql stable security definer
set search_path = '' as $$
  select m.id from app.miembros_negocio m
  join app.usuarios u on u.id = m.usuario_id and u.activo
  join app.negocios n on n.id = m.negocio_id and n.activo
  where m.negocio_id = app_private.negocio_id()
    and u.auth_user_id = app_private.actor_id() and m.activo
$$;
create function app_private.es_propietario() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from app.miembros_negocio
    where id = app_private.miembro_actual() and es_propietario and activo)
$$;
create function app_private.accede_local(p_local uuid) returns boolean language sql stable security definer
set search_path = '' as $$
  select app_private.miembro_actual() is not null and exists (
    select 1 from app.locales l where l.id = p_local and l.negocio_id = app_private.negocio_id() and l.activo
      and (app_private.es_propietario() or exists (
        select 1 from app.miembros_locales ml where ml.negocio_id = l.negocio_id
        and ml.local_id = l.id and ml.miembro_id = app_private.miembro_actual()))
  )
$$;
create function app_private.puede(p_permiso text, p_local uuid default null) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_miembro uuid := app_private.miembro_actual(); v_alcance text; v_ahora timestamptz := clock_timestamp();
begin
  if v_miembro is null then return false; end if;
  select alcance into v_alcance from app.permisos where codigo = p_permiso;
  if v_alcance is null then return false; end if;
  if v_alcance = 'local' then
    if p_local is null or not app_private.accede_local(p_local) then return false; end if;
  elsif p_local is not null then return false;
  end if;
  if app_private.es_propietario() then return true; end if;
  -- Una denegación vigente prevalece sobre cualquier rol o concesión.
  if exists (select 1 from app.permisos_otorgados p
    where p.negocio_id = app_private.negocio_id() and p.miembro_id = v_miembro
      and p.permiso_codigo = p_permiso and p.efecto = 'denegar'
      and (p.local_id is null or p.local_id = p_local)
      and p.revocado_en is null and p.inicia_en <= v_ahora
      and (p.vence_en is null or p.vence_en > v_ahora)) then return false; end if;
  return exists (select 1 from app.permisos_otorgados p
    where p.negocio_id = app_private.negocio_id() and p.miembro_id = v_miembro
      and p.permiso_codigo = p_permiso and p.efecto = 'permitir'
      and (p.local_id is null or p.local_id = p_local)
      and p.revocado_en is null and p.inicia_en <= v_ahora
      and (p.vence_en is null or p.vence_en > v_ahora))
    or exists (select 1 from app.miembros_roles mr
      join app.roles r on r.negocio_id = mr.negocio_id and r.id = mr.rol_id and r.activo
      join app.roles_permisos rp on rp.negocio_id = mr.negocio_id and rp.rol_id = mr.rol_id
      where mr.negocio_id = app_private.negocio_id() and mr.miembro_id = v_miembro
        and rp.permiso_codigo = p_permiso and (mr.local_id is null or mr.local_id = p_local));
end $$;

create function app_private.usuario_visible(p_usuario uuid) returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from app.usuarios u where u.id = p_usuario and
    (u.auth_user_id = app_private.actor_id() or
      (app_private.puede('equipo.ver') and exists (select 1 from app.miembros_negocio m
        where m.negocio_id = app_private.negocio_id() and m.usuario_id = u.id))))
$$;

create function app_private.inmutables_y_fechas() returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new)->'id') is distinct from (to_jsonb(old)->'id')
    or (to_jsonb(new)->'negocio_id') is distinct from (to_jsonb(old)->'negocio_id')
    or (to_jsonb(new)->'creado_en') is distinct from (to_jsonb(old)->'creado_en') then
    raise exception 'Identidad, negocio y fecha de creación inmutables' using errcode = '23514';
  end if;
  if to_jsonb(new) ? 'actualizado_en' then new.actualizado_en := clock_timestamp(); end if;
  return new;
end $$;

-- Escribir la raíz serializa cambios de propietarios incluso en REPEATABLE READ.
create function app_private.serializa_propietarios() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.es_propietario then update app.negocios set version = version + 1 where id = new.negocio_id; end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.es_propietario then update app.negocios set version = version + 1 where id = old.negocio_id; end if;
    return old;
  end if;
  if new.usuario_id <> old.usuario_id then raise exception 'La identidad del miembro es inmutable' using errcode = '23514'; end if;
  if (old.es_propietario or new.es_propietario) and
    (old.es_propietario is distinct from new.es_propietario or old.activo is distinct from new.activo) then
    update app.negocios set version = version + 1 where id = new.negocio_id;
  end if;
  return new;
end $$;
create trigger serializa_propietarios before insert or update or delete on app.miembros_negocio
for each row execute function app_private.serializa_propietarios();

create function app_private.exige_propietario() returns trigger language plpgsql security definer
set search_path = '' as $$
declare v_negocio uuid;
begin
  if tg_table_name = 'negocios' then v_negocio := new.id;
  elsif tg_op = 'DELETE' then v_negocio := old.negocio_id;
  else v_negocio := new.negocio_id; end if;
  if exists (select 1 from app.negocios where id = v_negocio) and not exists (
    select 1 from app.miembros_negocio where negocio_id = v_negocio and es_propietario and activo
  ) then raise exception 'El negocio debe conservar un propietario activo' using errcode = '23514'; end if;
  return null;
end $$;
create constraint trigger negocio_con_propietario after insert on app.negocios
deferrable initially deferred for each row execute function app_private.exige_propietario();
create constraint trigger conserva_propietario after insert or update or delete on app.miembros_negocio
deferrable initially deferred for each row execute function app_private.exige_propietario();

create function app_private.valida_configuracion() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if tg_table_name = 'negocios' then
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.zona_horaria) then
      raise exception 'Zona horaria desconocida' using errcode = '23514'; end if;
  elsif tg_table_name = 'permisos_otorgados' then
    if new.local_id is not null and exists (select 1 from app.permisos
      where codigo = new.permiso_codigo and alcance <> 'local') then
      raise exception 'Un permiso de negocio no admite local' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' and (new.miembro_id <> old.miembro_id or new.permiso_codigo <> old.permiso_codigo
      or new.local_id is distinct from old.local_id or new.otorgante_id <> old.otorgante_id) then
      raise exception 'Revocar y crear otra concesión para cambiar su destinatario o alcance' using errcode = '23514'; end if;
    if current_setting('role', true) = 'vexor_runtime' then
      if not app_private.es_propietario() then
        raise exception 'Solo el propietario modifica permisos individuales' using errcode = '42501'; end if;
      if tg_op = 'INSERT' and new.otorgante_id is distinct from app_private.miembro_actual() then
        raise exception 'El otorgante debe ser el actor actual' using errcode = '42501'; end if;
    end if;
    if tg_op = 'INSERT' and not exists (select 1 from app.miembros_negocio where negocio_id = new.negocio_id
      and id = new.otorgante_id and es_propietario and activo) then
      raise exception 'Solo el propietario concede o deniega permisos individuales' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger valida_negocio before insert or update on app.negocios
for each row execute function app_private.valida_configuracion();
create trigger valida_permiso before insert or update on app.permisos_otorgados
for each row execute function app_private.valida_configuracion();

create function app_private.audita_acceso() returns trigger language plpgsql security definer
set search_path = '' as $$
declare v_anterior jsonb; v_nuevo jsonb; v_negocio uuid;
begin
  if tg_op <> 'INSERT' then v_anterior := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_nuevo := to_jsonb(new); end if;
  if tg_table_name = 'negocios' then
    v_negocio := coalesce(v_nuevo->>'id', v_anterior->>'id')::uuid;
  else v_negocio := coalesce(v_nuevo->>'negocio_id', v_anterior->>'negocio_id')::uuid; end if;
  insert into app.auditoria_acceso(negocio_id, actor_auth_id, actor_sql, tabla, operacion, anterior, nuevo)
  values (v_negocio, app_private.actor_id(), session_user, tg_table_name, tg_op, v_anterior, v_nuevo);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['usuarios','negocios','miembros_negocio','locales','roles','permisos_otorgados'] loop
    execute format('create trigger inmutables_y_fechas before update on app.%I for each row execute function app_private.inmutables_y_fechas()', t);
  end loop;
  foreach t in array array['negocios','miembros_negocio','locales','roles','roles_permisos','miembros_roles','miembros_locales','permisos_otorgados'] loop
    execute format('create trigger audita_acceso after insert or update or delete on app.%I for each row execute function app_private.audita_acceso()', t);
  end loop;
  foreach t in array array['usuarios','negocios','miembros_negocio','locales','roles','permisos','roles_permisos','miembros_roles','miembros_locales','permisos_otorgados','auditoria_acceso'] loop
    execute format('alter table app.%I enable row level security', t);
    execute format('alter table app.%I force row level security', t);
  end loop;
end $$;

create policy usuarios_lectura on app.usuarios for select to vexor_runtime
using (app_private.usuario_visible(id));
create policy usuarios_edicion on app.usuarios for update to vexor_runtime
using (auth_user_id = app_private.actor_id() and activo)
with check (auth_user_id = app_private.actor_id() and activo);
create policy negocios_lectura on app.negocios for select to vexor_runtime
using (id = app_private.negocio_id() and app_private.miembro_actual() is not null);
create policy negocios_edicion on app.negocios for update to vexor_runtime
using (id = app_private.negocio_id() and app_private.puede('negocio.editar'))
with check (id = app_private.negocio_id() and app_private.puede('negocio.editar'));
create policy miembros_lectura on app.miembros_negocio for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.miembro_actual() is not null
  and (id = app_private.miembro_actual() or app_private.puede('equipo.ver')));
create policy miembros_gestion on app.miembros_negocio for all to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.es_propietario())
with check (negocio_id = app_private.negocio_id() and app_private.es_propietario());
create policy permisos_lectura on app.permisos for select to vexor_runtime
using (app_private.miembro_actual() is not null);

-- El propietario puede configurar locales desactivados y accesos; un trabajador
-- solo consulta locales asignados, activos y con permiso efectivo de lectura.
create policy locales_lectura on app.locales for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and
  (app_private.es_propietario() or (app_private.accede_local(id) and
    (app_private.puede('locales.gestionar') or app_private.puede('locales.ver', id)))));
create policy locales_insert on app.locales for insert to vexor_runtime
with check (negocio_id = app_private.negocio_id() and app_private.es_propietario());
create policy locales_update on app.locales for update to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.puede('locales.gestionar')
  and (app_private.es_propietario() or app_private.accede_local(id)))
with check (negocio_id = app_private.negocio_id() and app_private.puede('locales.gestionar')
  and (app_private.es_propietario() or app_private.accede_local(id)));

do $$ declare t text; begin
  foreach t in array array['roles','roles_permisos','miembros_roles','miembros_locales','permisos_otorgados'] loop
    execute format('create policy acceso_lectura on app.%I for select to vexor_runtime using (negocio_id = app_private.negocio_id() and app_private.puede(''equipo.ver''))', t);
    execute format('create policy acceso_gestion on app.%I for all to vexor_runtime using (negocio_id = app_private.negocio_id() and app_private.es_propietario()) with check (negocio_id = app_private.negocio_id() and app_private.es_propietario())', t);
  end loop;
  foreach t in array array['miembros_roles','miembros_locales','permisos_otorgados'] loop
    execute format('create policy acceso_propio on app.%I for select to vexor_runtime using (negocio_id = app_private.negocio_id() and miembro_id = app_private.miembro_actual())', t);
  end loop;
end $$;
create policy auditoria_lectura on app.auditoria_acceso for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.es_propietario());

-- No hay DELETE sobre entidades ni permisos individuales. Bajas lógicas y revocación.
grant select on all tables in schema app to vexor_runtime;
grant update (nombre) on app.usuarios to vexor_runtime;
grant update (nombre, zona_horaria) on app.negocios to vexor_runtime;
grant insert on app.miembros_negocio, app.locales, app.roles, app.permisos_otorgados to vexor_runtime;
grant update (es_propietario, activo) on app.miembros_negocio to vexor_runtime;
grant update (nombre, habilitado_venta, activo) on app.locales to vexor_runtime;
grant update (nombre, activo) on app.roles to vexor_runtime;
grant update (efecto, inicia_en, vence_en, revocado_en, motivo) on app.permisos_otorgados to vexor_runtime;
grant insert, delete on app.roles_permisos, app.miembros_roles, app.miembros_locales to vexor_runtime;
revoke all on all functions in schema app_private from public, anon, authenticated, service_role;
grant execute on function app_private.actor_id(), app_private.negocio_id(), app_private.miembro_actual(),
  app_private.es_propietario(), app_private.accede_local(uuid), app_private.puede(text, uuid),
  app_private.usuario_visible(uuid) to vexor_runtime;

comment on schema app is 'Datos del monolito VEXOR. No exponer en PostgREST/GraphQL.';
comment on role vexor_runtime is 'Solo NestJS: sin login, sin BYPASSRLS, SET LOCAL ROLE en cada transacción.';
comment on table app.permisos_otorgados is 'Excepciones individuales permitir/denegar; denegar prevalece. No incluye aún excepciones de venta ni política offline.';
