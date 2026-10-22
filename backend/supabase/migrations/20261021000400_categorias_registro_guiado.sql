create table app.categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references app.negocios(id),
  nombre text not null check (nombre = btrim(nombre) and char_length(nombre) between 1 and 120),
  padre_id uuid,
  version integer not null default 1 check (version > 0),
  creado_en timestamptz not null default clock_timestamp(),
  actualizado_en timestamptz not null default clock_timestamp(),
  unique (negocio_id, id),
  foreign key (negocio_id, padre_id) references app.categorias(negocio_id, id),
  check (padre_id is distinct from id)
);
create unique index categorias_nombre on app.categorias(negocio_id, coalesce(padre_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nombre));
create index categorias_padre on app.categorias(negocio_id, padre_id);
create function app_private.valida_categoria() returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.negocio_id::text, 17));
  if exists(with recursive superiores as (
    select id, padre_id from app.categorias where negocio_id = new.negocio_id and id = new.padre_id
    union all select c.id, c.padre_id from app.categorias c join superiores s on c.id = s.padre_id where c.negocio_id = new.negocio_id
  ) select 1 from superiores where id = new.id) then
    raise exception 'Una categoría no puede estar dentro de sí misma' using errcode = '23514', constraint = 'categoria_circular';
  end if;
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end $$;
create trigger valida_categoria before insert or update on app.categorias for each row execute function app_private.valida_categoria();
create trigger inmutables_y_fechas before update on app.categorias for each row execute function app_private.inmutables_y_fechas();
create trigger audita_acceso after insert or update or delete on app.categorias for each row execute function app_private.audita_acceso();
alter table app.categorias enable row level security;
alter table app.categorias force row level security;
create policy categorias_lectura on app.categorias for select to vexor_runtime
using (negocio_id = app_private.negocio_id() and (app_private.puede('productos.ver') or app_private.puede('productos.gestionar')));
create policy categorias_alta on app.categorias for insert to vexor_runtime
with check (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'));
create policy categorias_edicion on app.categorias for update to vexor_runtime
using (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'))
with check (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar'));
grant select, insert on app.categorias to vexor_runtime;
grant update(nombre, padre_id) on app.categorias to vexor_runtime;
revoke all on function app_private.valida_categoria() from public;

create function app_private.ejes_validos(ejes text[]) returns boolean language sql immutable set search_path = '' as $$
  select cardinality(ejes) <= 20 and not exists(select 1 from unnest(ejes) eje where eje is null or eje <> btrim(eje) or char_length(eje) not between 1 and 40)
    and (select count(*) = count(distinct lower(eje)) from unnest(ejes) eje)
$$;
alter table app.productos
  add column categoria_id uuid,
  add column ejes_variantes text[] not null default '{}'::text[] check (app_private.ejes_validos(ejes_variantes)),
  add foreign key (negocio_id, categoria_id) references app.categorias(negocio_id, id),
  add constraint categoria_solo_modelo check (producto_padre_id is null or (categoria_id is null and cardinality(ejes_variantes) = 0));
create index productos_categoria on app.productos(negocio_id, categoria_id) where categoria_id is not null;
grant update(categoria_id, ejes_variantes) on app.productos to vexor_runtime;
revoke all on function app_private.ejes_validos(text[]) from public;
grant execute on function app_private.ejes_validos(text[]) to vexor_runtime;
