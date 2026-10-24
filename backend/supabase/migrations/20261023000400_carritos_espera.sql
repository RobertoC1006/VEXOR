-- Los carritos compartidos son borradores: nunca reservan ni mueven existencias.
create table app.ventas_carritos (
 id uuid primary key, negocio_id uuid not null, local_id uuid not null,
 nombre text not null check(nombre=btrim(nombre) and char_length(nombre) between 1 and 80),
 contenido jsonb not null check(jsonb_typeof(contenido)='object'),
 estado text not null default 'espera' check(estado in ('espera','completado','descartado')),
 version integer not null default 1 check(version>0),
 venta_id uuid, creado_por uuid not null default app_private.actor_id(),
 actualizado_por uuid not null default app_private.actor_id(),
 creado_en timestamptz not null default clock_timestamp(),
 actualizado_en timestamptz not null default clock_timestamp(),
 unique(negocio_id,id),
 foreign key(negocio_id,local_id) references app.locales(negocio_id,id),
 foreign key(negocio_id,venta_id) references app.ventas(negocio_id,id),
 check((estado='completado')=(venta_id is not null))
);
create index carritos_local on app.ventas_carritos(negocio_id,local_id,creado_en,id) where estado='espera';
alter table app.ventas_carritos enable row level security;
alter table app.ventas_carritos force row level security;
create policy lectura on app.ventas_carritos for select to vexor_runtime using (
 negocio_id=app_private.negocio_id() and app_private.puede('ventas.cobrar',local_id));
grant select on app.ventas_carritos to vexor_runtime;
create trigger audita after insert or update on app.ventas_carritos for each row execute function app_private.audita_acceso();

create function app_private.guardar_carrito(n uuid,l uuid,c uuid,v integer,nombre text,contenido jsonb)
returns app.ventas_carritos language plpgsql security definer set search_path='' as $$
declare actual app.ventas_carritos; linea jsonb;
begin
 if n is distinct from app_private.negocio_id() or app_private.miembro_actual() is null or not app_private.puede('ventas.cobrar',l) then
  raise exception 'Sin permiso para este carrito' using errcode='42501';
 end if;
 if v is null or v<0 or nombre is null or nombre<>btrim(nombre) or char_length(nombre) not between 1 and 80
 or contenido is null or jsonb_typeof(contenido->'lineas') is distinct from 'array' then
  raise exception 'Carrito inválido' using errcode='23514';
 end if;
 if jsonb_array_length(contenido->'lineas') not between 1 and 100 or contenido->>'descuento' is null
 or (contenido->>'descuento') !~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$' then
  raise exception 'Carrito inválido' using errcode='23514';
 end if;
 for linea in select * from jsonb_array_elements(contenido->'lineas') loop
  if not exists(select 1 from app.productos where negocio_id=n and id=(linea->>'producto_id')::uuid)
  or (linea->>'cantidad') is null or (linea->>'cantidad')::integer not between 1 and 1000000
  or (linea->>'unidades_esperadas') is null or (linea->>'unidades_esperadas')::integer not between 1 and 1000000
  or (linea->>'precio_esperado') is null or (linea->>'precio_esperado') !~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$'
  or (linea->>'presentacion_id' is not null and not exists(select 1 from app.presentaciones where negocio_id=n and producto_id=(linea->>'producto_id')::uuid and id=(linea->>'presentacion_id')::uuid)) then
   raise exception 'El carrito contiene un artículo inválido para este negocio' using errcode='23514';
  end if;
 end loop;
 perform 1 from app.locales where negocio_id=n and id=l and activo and habilitado_venta for share;
 if not found then raise exception 'El puesto no está habilitado para venta' using errcode='23514'; end if;
 if v=0 then
  insert into app.ventas_carritos(id,negocio_id,local_id,nombre,contenido) values(c,n,l,nombre,contenido)
  on conflict(id) do nothing returning * into actual;
  if found then return actual; end if;
 end if;
 select * into actual from app.ventas_carritos where negocio_id=n and id=c and local_id=l for update;
 if actual.id is null or actual.estado<>'espera' then raise exception 'El carrito ya no está en espera' using errcode='23514'; end if;
 if actual.version<>v and not(actual.version=v+1 and actual.nombre=nombre and actual.contenido=contenido) then
  raise exception 'Otro vendedor modificó este carrito. Tus cambios se conservan; puedes guardarlos como otro carrito' using errcode='23514';
 end if;
 if actual.nombre=nombre and actual.contenido=contenido then return actual; end if;
 update app.ventas_carritos set nombre=guardar_carrito.nombre,contenido=guardar_carrito.contenido,
 version=version+1,actualizado_por=app_private.actor_id(),actualizado_en=clock_timestamp()
 where negocio_id=n and id=c returning * into actual;
 return actual;
end $$;

create function app_private.descartar_carrito(n uuid,c uuid,v integer) returns app.ventas_carritos
language plpgsql security definer set search_path='' as $$
declare actual app.ventas_carritos;
begin
 if n is distinct from app_private.negocio_id() or app_private.miembro_actual() is null then raise exception 'Sin acceso' using errcode='42501'; end if;
 select * into actual from app.ventas_carritos where negocio_id=n and id=c for update;
 if actual.id is null or not app_private.puede('ventas.cobrar',actual.local_id) then raise exception 'Sin acceso al carrito' using errcode='42501'; end if;
 if actual.estado='descartado' and actual.version=v+1 then return actual; end if;
 if actual.estado<>'espera' or actual.version<>v then raise exception 'El carrito cambió. Actualiza antes de descartarlo' using errcode='23514'; end if;
 update app.ventas_carritos set estado='descartado',version=version+1,actualizado_por=app_private.actor_id(),actualizado_en=clock_timestamp() where negocio_id=n and id=c returning * into actual;
 return actual;
end $$;

-- Se conserva una sola implementación del cobro y del cálculo de inventario.
alter function app_private.cobrar_venta(uuid,uuid,uuid,jsonb) rename to cobrar_venta_base;
revoke execute on function app_private.cobrar_venta_base(uuid,uuid,uuid,jsonb) from vexor_runtime;
create function app_private.cobrar_venta(n uuid,l uuid,op uuid,d jsonb) returns app.ventas
language plpgsql security definer set search_path='' as $$
declare carrito app.ventas_carritos; resultado app.ventas; c uuid:=(d->>'carrito_id')::uuid; v integer:=(d->>'carrito_version')::integer;
begin
 if n is distinct from app_private.negocio_id() or app_private.miembro_actual() is null or not app_private.puede('ventas.cobrar',l) then raise exception 'Sin permiso para cobrar' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(n::text||op::text));
 if exists(select 1 from app.ventas where negocio_id=n and operacion_id=op) then return app_private.cobrar_venta_base(n,l,op,d); end if;
 if (c is null)<>(v is null) then raise exception 'Referencia de carrito incompleta' using errcode='23514'; end if;
 if c is not null then
  select * into carrito from app.ventas_carritos where negocio_id=n and id=c and local_id=l for update;
  if carrito.id is null or carrito.estado<>'espera' or carrito.version<>v then raise exception 'El carrito cambió o ya fue cobrado. Actualiza antes de continuar' using errcode='23514'; end if;
  if carrito.contenido<>jsonb_build_object('lineas',d->'lineas','descuento',d->'descuento') then raise exception 'Guarda los cambios del carrito antes de cobrar' using errcode='23514'; end if;
 end if;
 resultado:=app_private.cobrar_venta_base(n,l,op,d);
 if c is not null then
  update app.ventas_carritos set estado='completado',venta_id=resultado.id,version=version+1,actualizado_por=app_private.actor_id(),actualizado_en=clock_timestamp() where negocio_id=n and id=c;
 end if;
 return resultado;
end $$;
revoke all on function app_private.guardar_carrito(uuid,uuid,uuid,integer,text,jsonb),app_private.descartar_carrito(uuid,uuid,integer),app_private.cobrar_venta(uuid,uuid,uuid,jsonb) from public;
grant execute on function app_private.guardar_carrito(uuid,uuid,uuid,integer,text,jsonb),app_private.descartar_carrito(uuid,uuid,integer),app_private.cobrar_venta(uuid,uuid,uuid,jsonb) to vexor_runtime;
