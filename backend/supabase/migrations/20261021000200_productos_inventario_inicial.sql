-- Primera entrega: fichas simples y conteo inicial por producto/local.
-- No crea compras ni deduce existencias de una ficha sin conteo confirmado.
insert into app.permisos(codigo, alcance, descripcion) values
  ('productos.ver', 'negocio', 'Consultar productos del negocio'),
  ('productos.gestionar', 'negocio', 'Crear y editar productos'),
  ('inventario.ver', 'local', 'Consultar inventario del local'),
  ('inventario.contar', 'local', 'Preparar conteos iniciales del local'),
  ('inventario.confirmar', 'local', 'Confirmar conteos iniciales del local');

create table app.productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id),
  nombre text not null check (nombre = btrim(nombre) and char_length(nombre) between 1 and 160),
  alias text check (alias is null or (alias = btrim(alias) and char_length(alias) between 1 and 160)),
  descripcion text check (descripcion is null or (descripcion = btrim(descripcion) and char_length(descripcion) between 1 and 1000)),
  codigo text check (codigo is null or (codigo = btrim(codigo) and char_length(codigo) between 1 and 120)),
  precio numeric(14,2) check (precio >= 0 and precio <> 'NaN'::numeric),
  costo numeric(14,2) check (costo >= 0 and costo <> 'NaN'::numeric),
  activo boolean not null default true,
  version integer not null default 1 check (version > 0),
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id)
);
create unique index productos_codigo on app.productos(negocio_id, codigo) where codigo is not null;
create index productos_nombre on app.productos(negocio_id, nombre, id);

create table app.inventario_inicial (
  negocio_id uuid not null,
  local_id uuid not null,
  producto_id uuid not null,
  cantidad integer not null check (cantidad >= 0),
  referencia text check (referencia is null or (referencia = btrim(referencia) and char_length(referencia) between 1 and 240)),
  estado text not null default 'preparacion' check (estado in ('preparacion', 'confirmado')),
  version integer not null default 1 check (version > 0),
  confirmado_en timestamptz,
  confirmado_por uuid,
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  primary key (negocio_id, local_id, producto_id),
  foreign key (negocio_id, local_id) references app.locales(negocio_id, id),
  foreign key (negocio_id, producto_id) references app.productos(negocio_id, id),
  check ((estado = 'confirmado') = (confirmado_en is not null and confirmado_por is not null))
);
create index inventario_producto on app.inventario_inicial(negocio_id, producto_id);

create function app_private.versiona_producto() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end $$;
create trigger versiona_producto before update on app.productos
for each row execute function app_private.versiona_producto();

create function app_private.valida_conteo_inicial() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.estado = 'confirmado' then
      raise exception 'El conteo confirmado requiere un movimiento de corrección' using errcode = '23514';
    end if;
    if new.local_id <> old.local_id or new.producto_id <> old.producto_id then
      raise exception 'El destino del conteo es inmutable' using errcode = '23514';
    end if;
    new.version := old.version + 1;
  elsif new.estado <> 'preparacion' then
    raise exception 'Primero guarda y revisa el conteo' using errcode = '23514';
  end if;
  if new.estado = 'confirmado' then
    if not app_private.puede('inventario.confirmar', new.local_id) then
      raise exception 'Sin permiso para confirmar' using errcode = '42501';
    end if;
    -- Confirmar nunca cambia simultáneamente la cantidad que se revisó.
    if new.cantidad <> old.cantidad or new.referencia is distinct from old.referencia then
      raise exception 'Guarda los cambios antes de confirmar' using errcode = '23514';
    end if;
    new.confirmado_en := clock_timestamp();
    new.confirmado_por := app_private.actor_id();
  else
    if not app_private.puede('inventario.contar', new.local_id) then
      raise exception 'Sin permiso para contar' using errcode = '42501';
    end if;
    new.confirmado_en := null;
    new.confirmado_por := null;
  end if;
  return new;
end $$;
create trigger valida_conteo_inicial before insert or update on app.inventario_inicial
for each row execute function app_private.valida_conteo_inicial();

do $$ declare t text; begin
  foreach t in array array['productos', 'inventario_inicial'] loop
    execute format('alter table app.%I enable row level security', t);
    execute format('alter table app.%I force row level security', t);
    execute format('create trigger inmutables_y_fechas before update on app.%I for each row execute function app_private.inmutables_y_fechas()', t);
    execute format('create trigger audita_acceso after insert or update or delete on app.%I for each row execute function app_private.audita_acceso()', t);
  end loop;
end $$;

create policy productos_lectura on app.productos for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and (app_private.puede('productos.ver') or app_private.puede('productos.gestionar')));
create policy productos_alta on app.productos for insert to vexor_runtime
with check (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'));

-- Consultar el nombre del local no requiere conceder permisos de configuración.
create policy inventario_local_lectura on app.locales for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.accede_local(id) and (
  app_private.puede('inventario.ver', id) or app_private.puede('inventario.contar', id) or app_private.puede('inventario.confirmar', id)));
create policy productos_edicion on app.productos for update to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'))
with check (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'));

create policy inventario_lectura on app.inventario_inicial for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and (
  app_private.puede('inventario.ver', local_id) or app_private.puede('inventario.contar', local_id) or app_private.puede('inventario.confirmar', local_id)));
create policy inventario_alta on app.inventario_inicial for insert to vexor_runtime
with check (negocio_id = app_private.negocio_id() and app_private.puede('inventario.contar', local_id));
create policy inventario_edicion on app.inventario_inicial for update to vexor_runtime
using (negocio_id = app_private.negocio_id() and (app_private.puede('inventario.contar', local_id) or app_private.puede('inventario.confirmar', local_id)))
with check (negocio_id = app_private.negocio_id() and (app_private.puede('inventario.contar', local_id) or app_private.puede('inventario.confirmar', local_id)));

grant select, insert on app.productos, app.inventario_inicial to vexor_runtime;
grant update (nombre, alias, descripcion, codigo, precio, costo, activo) on app.productos to vexor_runtime;
grant update (cantidad, referencia, estado) on app.inventario_inicial to vexor_runtime;
revoke all on function app_private.versiona_producto(), app_private.valida_conteo_inicial() from public;
