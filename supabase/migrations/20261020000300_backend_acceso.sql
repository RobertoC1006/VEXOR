-- Contratos acotados para listar pertenencias y completar altas por invitación.
-- Las credenciales del runtime siguen sin poder consultar tablas privadas.
create table app_private.administradores_plataforma (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  activo boolean not null default true,
  creado_en timestamptz not null default clock_timestamp()
);
alter table app_private.administradores_plataforma enable row level security;
alter table app_private.administradores_plataforma force row level security;

create table app_private.invitaciones_acceso (
  id uuid primary key,
  tipo text not null check (tipo in ('alta_negocio', 'miembro')),
  negocio_id uuid references app.negocios(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  negocio_nombre text check (length(btrim(negocio_nombre)) between 1 and 160),
  zona_horaria text,
  solicitante_auth_id uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default clock_timestamp(),
  vence_en timestamptz not null default (clock_timestamp() + interval '7 days'),
  revocada_en timestamptz,
  revocada_por uuid references auth.users(id) on delete restrict,
  aceptada_en timestamptz,
  aceptada_por uuid references auth.users(id) on delete restrict,
  miembro_id uuid,
  estado_envio text not null default 'pendiente' check (estado_envio in ('pendiente', 'enviando', 'enviado', 'error')),
  intentos integer not null default 0 check (intentos >= 0),
  envio_lease uuid,
  envio_actor uuid references auth.users(id) on delete restrict,
  envio_iniciado_en timestamptz,
  enviado_en timestamptz,
  error_codigo text check (error_codigo in ('auth_temporal', 'auth_rechazada', 'auth_no_configurado')),
  foreign key (negocio_id, miembro_id) references app.miembros_negocio(negocio_id, id) on delete restrict,
  check ((tipo = 'miembro' and negocio_id is not null and negocio_nombre is null and zona_horaria is null)
    or (tipo = 'alta_negocio' and negocio_nombre is not null and zona_horaria is not null)),
  check (vence_en > creado_en),
  check ((aceptada_en is null and aceptada_por is null and miembro_id is null)
    or (aceptada_en is not null and aceptada_por is not null and miembro_id is not null and negocio_id is not null))
);
create index invitaciones_destinatario on app_private.invitaciones_acceso(email, creado_en, id)
  where aceptada_en is null and revocada_en is null;
create index invitaciones_negocio on app_private.invitaciones_acceso(negocio_id, creado_en, id);
create index invitaciones_solicitante on app_private.invitaciones_acceso(solicitante_auth_id, creado_en, id);
create unique index invitacion_miembro_pendiente on app_private.invitaciones_acceso(negocio_id,email)
  where tipo='miembro' and aceptada_en is null and revocada_en is null;
alter table app_private.invitaciones_acceso enable row level security;
alter table app_private.invitaciones_acceso force row level security;
revoke all on app_private.administradores_plataforma, app_private.invitaciones_acceso
  from public, anon, authenticated, service_role, vexor_runtime;

create function app_private.es_admin_plataforma() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from app_private.administradores_plataforma
    where auth_user_id=app_private.actor_id() and activo)
$$;
create function app_private.actor_email() returns text language sql stable set search_path = '' as $$
  select nullif(lower(btrim(current_setting('vexor.actor_email',true))),'')
$$;

create function app_private.mis_negocios() returns table (
  negocio_id uuid, nombre text, zona_horaria text, miembro_id uuid, es_propietario boolean
) language sql stable security definer set search_path = '' as $$
  select n.id,n.nombre,n.zona_horaria,m.id,m.es_propietario
  from app.usuarios u join app.miembros_negocio m on m.usuario_id=u.id and m.activo
  join app.negocios n on n.id=m.negocio_id and n.activo
  where u.auth_user_id=app_private.actor_id() and u.activo
$$;

-- La solicitud es durable antes de contactar al proveedor de correo.
-- p_id es la clave UUID de idempotencia: mismo actor y contenido recuperan la fila.
create function app_private.solicitar_invitacion(
  p_id uuid, p_negocio uuid, p_email text, p_nombre text,
  p_negocio_nombre text default null, p_zona text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v app_private.invitaciones_acceso; v_tipo text;
begin
  if app_private.actor_id() is null then raise exception 'Identidad requerida' using errcode='42501'; end if;
  if p_negocio is null then
    if not app_private.es_admin_plataforma() then raise exception 'Solo administración de plataforma' using errcode='42501'; end if;
    v_tipo := 'alta_negocio';
    if p_negocio_nombre is null or p_zona is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zona) then
      raise exception 'Nombre y zona horaria válidos requeridos' using errcode='23514'; end if;
  else
    if p_negocio is distinct from app_private.negocio_id() or not app_private.es_propietario() then
      raise exception 'Solo propietario del negocio' using errcode='42501'; end if;
    if p_negocio_nombre is not null or p_zona is not null then raise exception 'Contenido inválido de invitación' using errcode='23514'; end if;
    v_tipo := 'miembro';
  end if;
  -- Serializa reintentos de la misma clave antes de cualquier efecto externo.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
  select * into v from app_private.invitaciones_acceso where id=p_id;
  if found then
    if v.solicitante_auth_id is distinct from app_private.actor_id() or v.tipo<>v_tipo
      or (v.tipo='miembro' and v.negocio_id is distinct from p_negocio)
      or v.email is distinct from lower(btrim(p_email)) or v.nombre is distinct from btrim(p_nombre)
      or v.negocio_nombre is distinct from btrim(p_negocio_nombre) or v.zona_horaria is distinct from p_zona then
      raise exception 'Clave de idempotencia usada con otro contenido' using errcode='23505';
    end if;
    return v.id;
  end if;
  insert into app_private.invitaciones_acceso(id,tipo,negocio_id,email,nombre,negocio_nombre,zona_horaria,solicitante_auth_id)
  values(p_id,v_tipo,p_negocio,lower(btrim(p_email)),btrim(p_nombre),btrim(p_negocio_nombre),p_zona,app_private.actor_id());
  return p_id;
end $$;

-- Administración: solo invitaciones de alta; el propietario: solo su negocio.
create function app_private.invitaciones_gestionables() returns table (
  id uuid, tipo text, negocio_id uuid, email text, nombre text, negocio_nombre text,
  creado_en timestamptz, vence_en timestamptz, revocada_en timestamptz, aceptada_en timestamptz,
  estado_envio text, intentos integer, error_codigo text
) language sql stable security definer set search_path = '' as $$
  select i.id,i.tipo,i.negocio_id,i.email,i.nombre,i.negocio_nombre,i.creado_en,i.vence_en,
    i.revocada_en,i.aceptada_en,i.estado_envio,i.intentos,i.error_codigo
  from app_private.invitaciones_acceso i where
    (app_private.negocio_id() is null and i.tipo='alta_negocio' and app_private.es_admin_plataforma())
    or (i.tipo='miembro' and i.negocio_id=app_private.negocio_id() and app_private.es_propietario())
$$;

create function app_private.mis_invitaciones() returns table (
  id uuid, tipo text, negocio_nombre text, nombre text, vence_en timestamptz
) language sql stable security definer set search_path = '' as $$
  select i.id,i.tipo,coalesce(i.negocio_nombre,n.nombre),i.nombre,i.vence_en
  from app_private.invitaciones_acceso i left join app.negocios n on n.id=i.negocio_id
  where i.email=app_private.actor_email() and app_private.actor_id() is not null
    and i.aceptada_en is null and i.revocada_en is null and i.vence_en>clock_timestamp()
    and (i.tipo='alta_negocio' or n.activo)
$$;

create function app_private.reservar_envio(p_id uuid,p_reenviar boolean default false)
returns table(email text, lease uuid) language plpgsql security definer set search_path = '' as $$
declare v app_private.invitaciones_acceso; v_lease uuid;
begin
  if not exists(select 1 from app_private.invitaciones_gestionables() i where i.id=p_id) then
    raise exception 'Invitación no accesible' using errcode='42501'; end if;
  select * into v from app_private.invitaciones_acceso where id=p_id for update;
  if v.aceptada_en is not null or v.revocada_en is not null or v.vence_en<=clock_timestamp() then
    raise exception 'La invitación ya no admite envío' using errcode='23514'; end if;
  if v.estado_envio='enviando' and v.envio_iniciado_en>clock_timestamp()-interval '2 minutes' then return; end if;
  if v.estado_envio='enviado' and not p_reenviar then return; end if;
  if p_reenviar and v.enviado_en>clock_timestamp()-interval '1 minute' then return; end if;
  v_lease:=gen_random_uuid();
  update app_private.invitaciones_acceso set estado_envio='enviando',intentos=intentos+1,
    envio_lease=v_lease,envio_actor=app_private.actor_id(),envio_iniciado_en=clock_timestamp(),error_codigo=null
    where id=p_id;
  return query select v.email,v_lease;
end $$;

create function app_private.finalizar_envio(p_id uuid,p_lease uuid,p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_filas integer;
begin
  if p_error is not null and p_error not in ('auth_temporal','auth_rechazada','auth_no_configurado') then
    raise exception 'Código de envío inválido' using errcode='23514'; end if;
  update app_private.invitaciones_acceso set estado_envio=case when p_error is null then 'enviado' else 'error' end,
    enviado_en=case when p_error is null then clock_timestamp() else enviado_en end,
    error_codigo=p_error,envio_lease=null
    where id=p_id and envio_lease=p_lease and envio_actor=app_private.actor_id();
  get diagnostics v_filas=row_count;
  return v_filas=1;
end $$;

create function app_private.revocar_invitacion(p_id uuid) returns boolean language plpgsql security definer
set search_path = '' as $$
declare v app_private.invitaciones_acceso;
begin
  if not exists(select 1 from app_private.invitaciones_gestionables() i where i.id=p_id) then
    raise exception 'Invitación no accesible' using errcode='42501'; end if;
  select * into v from app_private.invitaciones_acceso where id=p_id for update;
  if v.aceptada_en is not null then raise exception 'Gestionar la membresía ya aceptada' using errcode='23514'; end if;
  update app_private.invitaciones_acceso set revocada_en=coalesce(revocada_en,clock_timestamp()),
    revocada_por=coalesce(revocada_por,app_private.actor_id()) where id=p_id;
  return true;
end $$;

create function app_private.aceptar_invitacion(p_id uuid)
returns table(negocio_id uuid,miembro_id uuid) language plpgsql security definer set search_path = '' as $$
declare v app_private.invitaciones_acceso; v_usuario uuid; v_negocio uuid; v_miembro uuid;
begin
  select * into v from app_private.invitaciones_acceso where id=p_id for update;
  if not found or app_private.actor_id() is null or v.email is distinct from app_private.actor_email() then
    raise exception 'Invitación no accesible' using errcode='42501'; end if;
  if v.aceptada_en is not null then
    if v.aceptada_por is distinct from app_private.actor_id() then raise exception 'Invitación no accesible' using errcode='42501'; end if;
    return query select v.negocio_id,v.miembro_id; return;
  end if;
  if v.revocada_en is not null or v.vence_en<=clock_timestamp() then
    raise exception 'Invitación revocada o vencida' using errcode='23514'; end if;
  if v.tipo='alta_negocio' then
    if not exists(select 1 from app_private.administradores_plataforma where auth_user_id=v.solicitante_auth_id and activo) then
      raise exception 'El solicitante ya no está autorizado' using errcode='42501'; end if;
  elsif not exists(select 1 from app.miembros_negocio m join app.usuarios u on u.id=m.usuario_id and u.activo
    join app.negocios n on n.id=m.negocio_id and n.activo where m.negocio_id=v.negocio_id
    and m.es_propietario and m.activo and u.auth_user_id=v.solicitante_auth_id) then
    raise exception 'El solicitante ya no está autorizado' using errcode='42501';
  end if;
  -- No reactivar una identidad bloqueada ni cambiar su nombre al aceptar otro negocio.
  insert into app.usuarios(auth_user_id,nombre) values(app_private.actor_id(),v.nombre)
    on conflict(auth_user_id) do nothing;
  select id into v_usuario from app.usuarios where auth_user_id=app_private.actor_id() and activo for update;
  if v_usuario is null then raise exception 'Usuario desactivado' using errcode='42501'; end if;
  if v.tipo='alta_negocio' then
    insert into app.negocios(nombre,zona_horaria) values(v.negocio_nombre,v.zona_horaria) returning id into v_negocio;
  else v_negocio:=v.negocio_id; end if;
  insert into app.miembros_negocio(negocio_id,usuario_id,es_propietario)
    values(v_negocio,v_usuario,v.tipo='alta_negocio') on conflict on constraint miembros_negocio_negocio_id_usuario_id_key do nothing;
  select m.id into v_miembro from app.miembros_negocio m
    where m.negocio_id=v_negocio and m.usuario_id=v_usuario and m.activo;
  if v_miembro is null then raise exception 'Membresía desactivada: requiere decisión del propietario' using errcode='23514'; end if;
  update app_private.invitaciones_acceso set aceptada_en=clock_timestamp(),aceptada_por=app_private.actor_id(),
    negocio_id=v_negocio,miembro_id=v_miembro where id=p_id;
  return query select v_negocio,v_miembro;
end $$;

revoke all on function app_private.es_admin_plataforma(), app_private.actor_email(), app_private.mis_negocios(),
  app_private.solicitar_invitacion(uuid,uuid,text,text,text,text), app_private.invitaciones_gestionables(),
  app_private.mis_invitaciones(), app_private.reservar_envio(uuid,boolean),
  app_private.finalizar_envio(uuid,uuid,text), app_private.revocar_invitacion(uuid), app_private.aceptar_invitacion(uuid)
  from public,anon,authenticated,service_role;
grant execute on function app_private.es_admin_plataforma(), app_private.actor_email(), app_private.mis_negocios(),
  app_private.solicitar_invitacion(uuid,uuid,text,text,text,text), app_private.invitaciones_gestionables(),
  app_private.mis_invitaciones(), app_private.reservar_envio(uuid,boolean),
  app_private.finalizar_envio(uuid,uuid,text), app_private.revocar_invitacion(uuid), app_private.aceptar_invitacion(uuid)
  to vexor_runtime;
