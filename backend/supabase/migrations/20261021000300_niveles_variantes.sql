-- Los niveles son por ficha y no dependen del rubro. Las variantes comparten
-- el registro de productos, sus códigos únicos y el conteo existente.
create function app_private.caracteristicas_validas(datos jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(datos) <> 'array' then false else
    jsonb_array_length(datos) <= 20 and not exists (
      select 1 from jsonb_array_elements(datos) e where jsonb_typeof(e) <> 'object'
      or jsonb_typeof(e->'nombre') is distinct from 'string'
      or jsonb_typeof(e->'valor') is distinct from 'string'
      or char_length(e->>'nombre') not between 1 and 40 or e->>'nombre' <> btrim(e->>'nombre')
      or char_length(e->>'valor') not between 1 and 160 or e->>'valor' <> btrim(e->>'valor')
      or (e - 'nombre' - 'valor') <> '{}'::jsonb
    ) and (select count(*) = count(distinct lower(e->>'nombre')) from jsonb_array_elements(datos) e)
  end
$$;
create function app_private.firma_caracteristicas(datos jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(lower(e->>'nombre'), lower(e->>'valor')), '{}'::jsonb)
  from jsonb_array_elements(datos) e
$$;
alter table app.productos
  add column nivel_registro text not null default 'simple' check (nivel_registro in ('simple','intermedio','avanzado')),
  add column caracteristicas jsonb not null default '[]'::jsonb check (app_private.caracteristicas_validas(caracteristicas)),
  add column producto_padre_id uuid,
  add constraint producto_padre_fk foreign key (negocio_id, producto_padre_id) references app.productos(negocio_id,id),
  add constraint variante_no_raiz check (producto_padre_id is null or (producto_padre_id <> id and nivel_registro = 'simple' and jsonb_array_length(caracteristicas) > 0));
create index variantes_padre on app.productos(negocio_id, producto_padre_id) where producto_padre_id is not null;
create unique index variantes_combinacion on app.productos(negocio_id, producto_padre_id, app_private.firma_caracteristicas(caracteristicas)) where producto_padre_id is not null;

create function app_private.valida_nivel_producto() returns trigger language plpgsql set search_path = '' as $$
declare padre app.productos;
begin
  if tg_op = 'UPDATE' and new.producto_padre_id is distinct from old.producto_padre_id then
    raise exception 'La pertenencia de una variante es inmutable' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.producto_padre_id is not null
    and app_private.firma_caracteristicas(new.caracteristicas) is distinct from app_private.firma_caracteristicas(old.caracteristicas)
    and exists(select 1 from app.inventario_inicial where negocio_id = new.negocio_id and producto_id = new.id) then
    raise exception 'No cambiar la combinación de una variante ya contada' using errcode = '23514', constraint = 'producto_con_conteo';
  end if;
  if new.producto_padre_id is not null then
    select * into padre from app.productos where negocio_id = new.negocio_id and id = new.producto_padre_id for update;
    if not found or padre.producto_padre_id is not null or padre.nivel_registro <> 'avanzado' then
      raise exception 'La variante requiere una ficha avanzada del mismo negocio' using errcode = '23514';
    end if;
  elsif tg_op = 'UPDATE' and new.nivel_registro is distinct from old.nivel_registro then
    if new.nivel_registro = 'avanzado' and exists(select 1 from app.inventario_inicial where negocio_id = new.negocio_id and producto_id = new.id) then
      raise exception 'Se requiere distribuir explícitamente el conteo antes de pasar a variantes' using errcode = '23514', constraint = 'producto_con_conteo';
    end if;
    if old.nivel_registro = 'avanzado' and exists(select 1 from app.productos where negocio_id = new.negocio_id and producto_padre_id = new.id) then
      raise exception 'Conservar el nivel avanzado mientras existan variantes' using errcode = '23514', constraint = 'producto_con_variantes';
    end if;
  end if;
  return new;
end $$;
create trigger valida_nivel_producto before insert or update on app.productos
for each row execute function app_private.valida_nivel_producto();

create function app_private.conteo_producto_individual() returns trigger language plpgsql set search_path = '' as $$
declare nivel text;
begin
  -- El bloqueo coordina el primer conteo con un cambio simultáneo de nivel.
  select nivel_registro into nivel from app.productos where negocio_id = new.negocio_id and id = new.producto_id for update;
  if nivel = 'avanzado' then
    raise exception 'Contar cada variante, no el total del modelo avanzado' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger conteo_producto_individual before insert or update on app.inventario_inicial
for each row execute function app_private.conteo_producto_individual();

grant update(nivel_registro, caracteristicas) on app.productos to vexor_runtime;
revoke all on function app_private.caracteristicas_validas(jsonb), app_private.firma_caracteristicas(jsonb), app_private.valida_nivel_producto(), app_private.conteo_producto_individual() from public;
grant execute on function app_private.caracteristicas_validas(jsonb), app_private.firma_caracteristicas(jsonb) to vexor_runtime;
