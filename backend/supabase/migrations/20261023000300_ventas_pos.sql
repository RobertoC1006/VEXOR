-- Ventas online atómicas; claves de operación preparadas para reintentos.

insert into app.permisos(codigo,alcance,descripcion) values

 ('ventas.cobrar','local','Registrar y consultar ventas del puesto'),

 ('ventas.descontar','local','Aplicar descuentos dentro del límite del propietario');

create table app.ventas_politicas (

 negocio_id uuid primary key references app.negocios(id),

 limite_descuento numeric(14,2) not null default 0 check(limite_descuento>=0 and limite_descuento<>'NaN'::numeric)

);

create table app.presentaciones (

 id uuid primary key default gen_random_uuid(), negocio_id uuid not null,

 producto_id uuid not null, nombre text not null check(char_length(btrim(nombre)) between 1 and 80),

 unidades integer not null check(unidades between 1 and 1000000),

 precio numeric(14,2) not null check(precio>=0 and precio<>'NaN'::numeric),

 activo boolean not null default true, unique(negocio_id,id),

 foreign key(negocio_id,producto_id) references app.productos(negocio_id,id)

);

create table app.ventas (

 id uuid primary key default gen_random_uuid(), negocio_id uuid not null,

 local_id uuid not null, operacion_id uuid not null, solicitud jsonb not null,

 subtotal numeric(14,2) not null check(subtotal>=0),

 descuento numeric(14,2) not null check(descuento>=0 and descuento<=subtotal),

 total numeric(14,2) not null check(total=subtotal-descuento),

 pagos jsonb not null, efectivo_recibido numeric(14,2) not null check(efectivo_recibido>=0),

 vuelto numeric(14,2) not null check(vuelto>=0),

 actor_id uuid not null default app_private.actor_id(), creado_en timestamptz not null default clock_timestamp(),

 unique(negocio_id,id), unique(negocio_id,operacion_id),

 foreign key(negocio_id,local_id) references app.locales(negocio_id,id)

);

create table app.ventas_lineas (

 id uuid primary key default gen_random_uuid(), negocio_id uuid not null, venta_id uuid not null,

 producto_id uuid not null, presentacion_id uuid, nombre text not null, presentacion text not null,

 cantidad integer not null check(cantidad>0), unidades integer not null check(unidades>0),

 precio numeric(14,2) not null check(precio>=0),

 foreign key(negocio_id,venta_id) references app.ventas(negocio_id,id),

 foreign key(negocio_id,producto_id) references app.productos(negocio_id,id),

 foreign key(negocio_id,presentacion_id) references app.presentaciones(negocio_id,id)

);

alter table app.stock_movimientos drop constraint stock_movimientos_tipo_check;

alter table app.stock_movimientos add constraint stock_movimientos_tipo_check check(tipo in ('ajuste','salida','recepcion','venta'));

alter table app.stock_movimientos add column venta_id uuid;

alter table app.stock_movimientos add foreign key(negocio_id,venta_id) references app.ventas(negocio_id,id);

alter table app.stock_movimientos add check((tipo='venta')=(venta_id is not null));

create unique index movimiento_venta_producto on app.stock_movimientos(negocio_id,venta_id,producto_id) where venta_id is not null;

create index ventas_fecha on app.ventas(negocio_id,local_id,creado_en desc);

create index lineas_venta on app.ventas_lineas(negocio_id,venta_id);

-- La venta escribe el mismo libro de movimientos; no altera el conteo inicial.

create or replace function app_private.valida_movimiento_stock() returns trigger language plpgsql security definer set search_path='' as $$

declare inicial integer; saldo bigint; envio app.stock_movimientos; recibidas bigint;

begin

 if new.negocio_id is distinct from app_private.negocio_id() or not app_private.accede_local(new.local_id)

 or not app_private.puede(case new.tipo when 'ajuste' then 'inventario.ajustar' when 'salida' then 'inventario.transferir' when 'venta' then 'ventas.cobrar' else 'inventario.recibir' end,new.local_id) then

  raise exception 'Sin permiso para este movimiento' using errcode='42501';

 end if;

 if new.tipo='venta' and not exists(select 1 from app.ventas v where v.negocio_id=new.negocio_id and v.id=new.venta_id and v.local_id=new.local_id and v.actor_id=app_private.actor_id()) then raise exception 'Venta inválida' using errcode='23514'; end if;

 if new.tipo='venta' and new.cantidad is distinct from (select sum(vl.cantidad::bigint*vl.unidades) from app.ventas_lineas vl where vl.negocio_id=new.negocio_id and vl.venta_id=new.venta_id and vl.producto_id=new.producto_id) then raise exception 'Salida de venta inválida' using errcode='23514'; end if;

 perform pg_advisory_xact_lock(hashtext(new.negocio_id::text || new.producto_id::text));

 if not exists(select 1 from app.locales where negocio_id=new.negocio_id and id=new.local_id and activo)

 or not exists(select 1 from app.productos p where p.negocio_id=new.negocio_id and p.id=new.producto_id and p.activo and p.nivel_registro<>'avanzado' and (p.producto_padre_id is null or exists(select 1 from app.productos r where r.negocio_id=p.negocio_id and r.id=p.producto_padre_id and r.activo))) then

  raise exception 'El producto o local no está activo' using errcode='23514';

 end if;

 select cantidad into inicial from app.inventario_inicial where negocio_id=new.negocio_id and local_id=new.local_id and producto_id=new.producto_id and estado='confirmado';

 if inicial is null then raise exception 'Confirma primero el conteo de este producto en el local' using errcode='23514'; end if;

 select inicial+coalesce(sum(case when tipo in ('salida','venta') then -cantidad else cantidad end),0) into saldo from app.stock_movimientos where negocio_id=new.negocio_id and local_id=new.local_id and producto_id=new.producto_id;

 if new.tipo='salida' then

  if not app_private.accede_local(new.destino_id) then raise exception 'Sin acceso al destino' using errcode='42501'; end if;

  if not exists(select 1 from app.locales where negocio_id=new.negocio_id and id=new.destino_id and activo) or not exists(select 1 from app.inventario_inicial where negocio_id=new.negocio_id and local_id=new.destino_id and producto_id=new.producto_id and estado='confirmado') then

   raise exception 'Confirma primero el conteo en el destino activo, incluso si es cero' using errcode='23514';

  end if;

 elsif new.tipo='recepcion' then

  select * into envio from app.stock_movimientos where negocio_id=new.negocio_id and id=new.traslado_id and tipo='salida' for update;

  if envio.id is null or envio.destino_id<>new.local_id or envio.producto_id<>new.producto_id then raise exception 'El traslado no corresponde al producto y destino' using errcode='23514'; end if;

  new.origen_id:=envio.local_id;

  select coalesce(sum(cantidad),0) into recibidas from app.stock_movimientos where negocio_id=new.negocio_id and traslado_id=envio.id;

  if recibidas+new.cantidad>envio.cantidad then raise exception 'La recepción supera las unidades en tránsito' using errcode='23514'; end if;

 end if;

 saldo:=saldo+case when new.tipo in ('salida','venta') then -new.cantidad else new.cantidad end;

 if saldo<0 or saldo>2147483647 then raise exception 'El movimiento deja un saldo fuera de rango' using errcode='23514'; end if;

 if new.tipo<>'recepcion' then new.origen_id:=null; end if;

 new.actor_id:=app_private.actor_id(); new.creado_en:=clock_timestamp();

 return new;

end $$;

create or replace view app.existencias with (security_invoker=true) as

select i.negocio_id,i.local_id,i.producto_id,i.referencia,i.estado,i.version,i.confirmado_en,i.confirmado_por,i.creado_en,i.actualizado_en,

 (i.cantidad+case when i.estado='confirmado' then coalesce((select sum(case when m.tipo in ('salida','venta') then -m.cantidad else m.cantidad end) from app.stock_movimientos m where m.negocio_id=i.negocio_id and m.local_id=i.local_id and m.producto_id=i.producto_id),0) else 0 end)::integer as cantidad

from app.inventario_inicial i;

grant select on app.existencias to vexor_runtime;



-- El vendedor consulta disponibilidad sin requerir permisos para editar inventario.

create policy pos_productos on app.productos for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and exists(select 1 from app.locales l where l.negocio_id=app.productos.negocio_id and l.activo and l.habilitado_venta and app_private.accede_local(l.id) and app_private.puede('ventas.cobrar',l.id)));

create policy pos_locales on app.locales for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and app_private.accede_local(id) and app_private.puede('ventas.cobrar',id));

create policy pos_conteos on app.inventario_inicial for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('ventas.cobrar',local_id));

create policy pos_movimientos on app.stock_movimientos for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('ventas.cobrar',local_id));

do $$ declare t text; begin

 foreach t in array array['ventas_politicas','presentaciones','ventas','ventas_lineas'] loop

 execute format('alter table app.%I enable row level security',t);

 execute format('alter table app.%I force row level security',t);

 execute format('create trigger audita after insert or update on app.%I for each row execute function app_private.audita_acceso()',t);

 execute format('create policy lectura on app.%I for select to vexor_runtime using(negocio_id=app_private.negocio_id())',t);

 end loop;

end $$;

-- Ventas y líneas solo son visibles en puestos autorizados.

drop policy lectura on app.ventas;

create policy lectura on app.ventas for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('ventas.cobrar',local_id));

drop policy lectura on app.ventas_lineas;

create policy lectura on app.ventas_lineas for select to vexor_runtime using (

 negocio_id=app_private.negocio_id() and exists(select 1 from app.ventas v where v.negocio_id=app.ventas_lineas.negocio_id and v.id=venta_id));

create policy alta on app.presentaciones for insert to vexor_runtime with check(negocio_id=app_private.negocio_id() and app_private.puede('productos.gestionar'));

create policy edicion on app.presentaciones for update to vexor_runtime using(negocio_id=app_private.negocio_id() and app_private.puede('productos.gestionar')) with check(negocio_id=app_private.negocio_id() and app_private.puede('productos.gestionar'));

create policy alta on app.ventas_politicas for insert to vexor_runtime with check(negocio_id=app_private.negocio_id() and app_private.es_propietario());

create policy edicion on app.ventas_politicas for update to vexor_runtime using(negocio_id=app_private.negocio_id() and app_private.es_propietario()) with check(negocio_id=app_private.negocio_id() and app_private.es_propietario());

grant select on app.ventas,app.ventas_lineas,app.presentaciones,app.ventas_politicas to vexor_runtime;

grant insert on app.presentaciones,app.ventas_politicas to vexor_runtime;

grant update(nombre,unidades,precio,activo) on app.presentaciones to vexor_runtime;

grant update(limite_descuento) on app.ventas_politicas to vexor_runtime;



-- Única entrada de escritura de ventas, incluso para el runtime SQL restringido.

create function app_private.cobrar_venta(n uuid,l uuid,op uuid,d jsonb) returns app.ventas

language plpgsql security definer set search_path='' as $$

declare anterior app.ventas; resultado app.ventas; linea jsonb; p app.productos; pr app.presentaciones;

 sub numeric:=0; rebaja numeric; importe numeric; ef numeric; ya numeric; pl numeric; recibido numeric; limite numeric;

 precio numeric; total_unidades bigint; unidades integer; cantidad integer; nombre text; items jsonb:='[]'; clave uuid;

begin

 if n is distinct from app_private.negocio_id() or app_private.miembro_actual() is null or not app_private.accede_local(l) or not app_private.puede('ventas.cobrar',l) then raise exception 'Sin permiso para cobrar' using errcode='42501'; end if;

 perform pg_advisory_xact_lock(hashtext(n::text||op::text));

 select * into anterior from app.ventas where negocio_id=n and operacion_id=op;

 if found then

  if anterior.local_id<>l or anterior.solicitud<>d then raise exception 'La operación corresponde a otra venta' using errcode='23514'; end if;

  return anterior;

 end if;

 perform 1 from app.locales where negocio_id=n and id=l and activo and habilitado_venta for share;

 if not found then raise exception 'El puesto no está habilitado para venta' using errcode='23514'; end if;

 if jsonb_typeof(d->'lineas')<>'array' or jsonb_array_length(d->'lineas') not between 1 and 100 then raise exception 'Carrito inválido' using errcode='23514'; end if;

 -- Mismo orden de bloqueo que ajustes/traslados; se agrupan las salidas por producto.

 for clave in select distinct (x->>'producto_id')::uuid from jsonb_array_elements(d->'lineas') x order by 1 loop

  perform pg_advisory_xact_lock(hashtext(n::text||clave::text));

 end loop;

 for linea in select * from jsonb_array_elements(d->'lineas') loop

  select * into p from app.productos where negocio_id=n and id=(linea->>'producto_id')::uuid and activo and nivel_registro<>'avanzado' for share;

  if p.id is null then raise exception 'Producto no disponible' using errcode='23514'; end if;

  if p.producto_padre_id is not null then

   perform 1 from app.productos where negocio_id=n and id=p.producto_padre_id and activo for share;

   if not found then raise exception 'Modelo inactivo' using errcode='23514'; end if;

  end if;

  cantidad:=(linea->>'cantidad')::integer;

  if cantidad is null or cantidad not between 1 and 1000000 then raise exception 'Cantidad inválida' using errcode='23514'; end if;

  precio:=p.precio; unidades:=1; nombre:='Unidad'; pr:=null;

  if linea->>'presentacion_id' is not null then

   select * into pr from app.presentaciones where negocio_id=n and id=(linea->>'presentacion_id')::uuid and producto_id=p.id and activo for share;

   if pr.id is null then raise exception 'Presentación no disponible' using errcode='23514'; end if;

   precio:=pr.precio; unidades:=pr.unidades; nombre:=pr.nombre;

  end if;

  if precio is null then raise exception 'Registra el precio en el catálogo antes de vender' using errcode='23514'; end if;

  if precio<>(linea->>'precio_esperado')::numeric or linea->>'precio_esperado' is null then raise exception 'El precio cambió. Revisa el carrito' using errcode='23514'; end if;

  if unidades is distinct from (linea->>'unidades_esperadas')::integer then raise exception 'La equivalencia cambió. Revisa el carrito' using errcode='23514'; end if;

  sub:=sub+precio*cantidad;

  items:=items||jsonb_build_array(jsonb_build_object('producto_id',p.id,'presentacion_id',pr.id,'nombre',p.nombre,'presentacion',nombre,'cantidad',cantidad,'unidades',unidades,'precio',precio));

 end loop;

 if sub>999999999999.99 then raise exception 'El importe de la venta supera el máximo permitido' using errcode='23514'; end if;
 rebaja:=(d->>'descuento')::numeric; recibido:=(d->>'efectivo_recibido')::numeric;

 ef:=(d->'pagos'->>'efectivo')::numeric; ya:=(d->'pagos'->>'yape')::numeric; pl:=(d->'pagos'->>'plin')::numeric;

 if rebaja is null or recibido is null or ef is null or ya is null or pl is null or

 rebaja<0 or rebaja>sub or least(recibido,ef,ya,pl)<0 or

 rebaja<>round(rebaja,2) or recibido<>round(recibido,2) or ef<>round(ef,2) or ya<>round(ya,2) or pl<>round(pl,2) or

 'NaN'::numeric in (rebaja,recibido,ef,ya,pl) then raise exception 'Importes inválidos' using errcode='23514'; end if;

 importe:=sub-rebaja;

 if ef+ya+pl<>importe or recibido<ef or (ef=0 and recibido<>0) then raise exception 'Cubre el total exacto y revisa el efectivo recibido' using errcode='23514'; end if;

 if rebaja>0 and not app_private.es_propietario() then

  if not app_private.puede('ventas.descontar',l) then raise exception 'Sin permiso para descuentos' using errcode='42501'; end if;

  select limite_descuento into limite from app.ventas_politicas where negocio_id=n for share;

  if rebaja>coalesce(limite,0) then raise exception 'El descuento supera el límite del propietario' using errcode='23514'; end if;

 end if;

 insert into app.ventas(negocio_id,local_id,operacion_id,solicitud,subtotal,descuento,total,pagos,efectivo_recibido,vuelto)

 values(n,l,op,d,sub,rebaja,importe,d->'pagos',recibido,recibido-ef) returning * into resultado;

 for linea in select * from jsonb_array_elements(items) loop

  insert into app.ventas_lineas(negocio_id,venta_id,producto_id,presentacion_id,nombre,presentacion,cantidad,unidades,precio)

  values(n,resultado.id,(linea->>'producto_id')::uuid,(linea->>'presentacion_id')::uuid,linea->>'nombre',linea->>'presentacion',(linea->>'cantidad')::integer,(linea->>'unidades')::integer,(linea->>'precio')::numeric);

 end loop;

 for clave, total_unidades in select vl.producto_id,sum(vl.cantidad::bigint*vl.unidades)::bigint from app.ventas_lineas vl where vl.negocio_id=n and vl.venta_id=resultado.id group by vl.producto_id order by vl.producto_id loop

  if total_unidades>2147483647 then raise exception 'La cantidad de unidades supera el máximo permitido' using errcode='23514'; end if;
  insert into app.stock_movimientos(negocio_id,operacion_id,producto_id,local_id,tipo,cantidad,motivo,venta_id)

  values(n,gen_random_uuid(),clave,l,'venta',total_unidades::integer,'Venta POS',resultado.id);

 end loop;

 return resultado;

end $$;

revoke all on function app_private.cobrar_venta(uuid,uuid,uuid,jsonb) from public;

grant execute on function app_private.cobrar_venta(uuid,uuid,uuid,jsonb) to vexor_runtime;



create policy pos_fotos on app.productos_fotos for select to vexor_runtime using (negocio_id=app_private.negocio_id() and exists(select 1 from app.locales l where l.negocio_id=app.productos_fotos.negocio_id and l.activo and l.habilitado_venta and app_private.puede('ventas.cobrar',l.id)));


create index presentaciones_producto on app.presentaciones(negocio_id,producto_id) where activo;

-- Un código identifica una sola ficha/combinación/presentación del negocio.
alter table app.presentaciones add column codigo text check(codigo is null or (codigo=btrim(codigo) and char_length(codigo) between 1 and 120));
grant update(codigo) on app.presentaciones to vexor_runtime;
create unique index presentaciones_codigo on app.presentaciones(negocio_id,codigo) where codigo is not null;
create function app_private.valida_codigo_comercial() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.codigo is not null then
  perform pg_advisory_xact_lock(hashtext(new.negocio_id::text||':codigo:'||new.codigo));
  if (tg_table_name='presentaciones' and exists(select 1 from app.productos where negocio_id=new.negocio_id and codigo=new.codigo))
    or (tg_table_name='productos' and exists(select 1 from app.presentaciones where negocio_id=new.negocio_id and codigo=new.codigo)) then
   raise exception 'El código ya identifica otro artículo o presentación' using errcode='23505',constraint='presentaciones_codigo';
  end if;
 end if;
 return new;
end $$;
revoke all on function app_private.valida_codigo_comercial() from public;
create trigger valida_codigo_comercial before insert or update of codigo on app.productos for each row execute function app_private.valida_codigo_comercial();
create trigger valida_codigo_comercial before insert or update of codigo on app.presentaciones for each row execute function app_private.valida_codigo_comercial();

create policy pos_minimos on app.stock_minimos for select to vexor_runtime using (negocio_id=app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('ventas.cobrar',local_id));
