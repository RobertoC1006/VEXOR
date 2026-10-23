-- El conteo inicial permanece inmutable. El saldo se deriva de movimientos anexados.
insert into app.permisos(codigo, alcance, descripcion) values
 ('inventario.transferir','local','Dar salida a un traslado de stock'),
 ('inventario.recibir','local','Recibir stock trasladado al local'),
 ('inventario.ajustar','local','Ajustar existencias con motivo');

create table app.stock_movimientos (
 id uuid primary key default gen_random_uuid(),
 negocio_id uuid not null references app.negocios(id),
 operacion_id uuid not null,
 producto_id uuid not null,
 local_id uuid not null,
 destino_id uuid,
 origen_id uuid,
 traslado_id uuid,
 tipo text not null check(tipo in ('ajuste','salida','recepcion')),
 cantidad integer not null check(cantidad <> 0 and cantidad > -2147483647),
 motivo text not null check(motivo=btrim(motivo) and char_length(motivo) between 1 and 240),
 actor_id uuid not null default app_private.actor_id(),
 creado_en timestamptz not null default clock_timestamp(),
 unique(negocio_id,id), unique(negocio_id,operacion_id),
 foreign key(negocio_id,producto_id) references app.productos(negocio_id,id),
 foreign key(negocio_id,local_id) references app.locales(negocio_id,id),
 foreign key(negocio_id,destino_id) references app.locales(negocio_id,id),
 foreign key(negocio_id,origen_id) references app.locales(negocio_id,id),
 foreign key(negocio_id,traslado_id) references app.stock_movimientos(negocio_id,id),
 check ((tipo='salida')=(destino_id is not null)),
 check ((tipo='recepcion')=(traslado_id is not null)),
 check (destino_id is null or destino_id<>local_id),
 check (tipo='ajuste' or cantidad>0)
);
create index movimientos_saldo on app.stock_movimientos(negocio_id,local_id,producto_id);
create index movimientos_recepcion on app.stock_movimientos(negocio_id,traslado_id);
alter table app.stock_movimientos enable row level security;
alter table app.stock_movimientos force row level security;
create policy movimientos_lectura on app.stock_movimientos for select to vexor_runtime using (
 negocio_id=app_private.negocio_id() and (
 (app_private.accede_local(local_id) and (app_private.puede('inventario.ver',local_id) or app_private.puede('inventario.contar',local_id) or app_private.puede('inventario.confirmar',local_id)))
 or (tipo='salida' and app_private.accede_local(destino_id) and app_private.puede('inventario.recibir',destino_id))
 or (tipo='recepcion' and app_private.accede_local(origen_id) and (app_private.puede('inventario.ver',origen_id) or app_private.puede('inventario.contar',origen_id) or app_private.puede('inventario.confirmar',origen_id)))));
create policy movimientos_alta on app.stock_movimientos for insert to vexor_runtime with check (
 negocio_id=app_private.negocio_id() and app_private.accede_local(local_id) and
 app_private.puede(case tipo when 'ajuste' then 'inventario.ajustar' when 'salida' then 'inventario.transferir' else 'inventario.recibir' end,local_id));
grant select, insert on app.stock_movimientos to vexor_runtime;

-- Un solo orden de bloqueos por producto evita salidas/ajustes concurrentes negativos.
-- SECURITY DEFINER solo permite validar saldos y recepciones que la RLS del lector
-- podría ocultar. No concede escritura adicional y verifica contexto y permisos.
create function app_private.valida_movimiento_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare inicial integer; saldo bigint; envio app.stock_movimientos; recibidas bigint;
begin
 if new.negocio_id is distinct from app_private.negocio_id() or not app_private.accede_local(new.local_id)
 or not app_private.puede(case new.tipo when 'ajuste' then 'inventario.ajustar' when 'salida' then 'inventario.transferir' else 'inventario.recibir' end,new.local_id) then
  raise exception 'Sin permiso para este movimiento' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtext(new.negocio_id::text || new.producto_id::text));
 if not exists(select 1 from app.locales where negocio_id=new.negocio_id and id=new.local_id and activo)
 or not exists(select 1 from app.productos p where p.negocio_id=new.negocio_id and p.id=new.producto_id and p.activo and p.nivel_registro<>'avanzado' and (p.producto_padre_id is null or exists(select 1 from app.productos r where r.negocio_id=p.negocio_id and r.id=p.producto_padre_id and r.activo))) then
  raise exception 'El producto o local no está activo' using errcode='23514';
 end if;
 select cantidad into inicial from app.inventario_inicial where negocio_id=new.negocio_id and local_id=new.local_id and producto_id=new.producto_id and estado='confirmado';
 if inicial is null then raise exception 'Confirma primero el conteo de este producto en el local' using errcode='23514'; end if;
 select inicial+coalesce(sum(case when tipo='salida' then -cantidad else cantidad end),0) into saldo from app.stock_movimientos where negocio_id=new.negocio_id and local_id=new.local_id and producto_id=new.producto_id;
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
 saldo:=saldo+case when new.tipo='salida' then -new.cantidad else new.cantidad end;
 if saldo<0 or saldo>2147483647 then raise exception 'El movimiento deja un saldo fuera de rango' using errcode='23514'; end if;
 if new.tipo<>'recepcion' then new.origen_id:=null; end if;
 new.actor_id:=app_private.actor_id(); new.creado_en:=clock_timestamp();
 return new;
end $$;
revoke all on function app_private.valida_movimiento_stock() from public;
create trigger valida_movimiento before insert on app.stock_movimientos for each row execute function app_private.valida_movimiento_stock();
create trigger audita_movimiento after insert on app.stock_movimientos for each row execute function app_private.audita_acceso();

create view app.existencias with (security_invoker=true) as
select i.negocio_id,i.local_id,i.producto_id,i.referencia,i.estado,i.version,i.confirmado_en,i.confirmado_por,i.creado_en,i.actualizado_en,
 (i.cantidad+case when i.estado='confirmado' then coalesce((select sum(case when m.tipo='salida' then -m.cantidad else m.cantidad end) from app.stock_movimientos m where m.negocio_id=i.negocio_id and m.local_id=i.local_id and m.producto_id=i.producto_id),0) else 0 end)::integer as cantidad
from app.inventario_inicial i;
grant select on app.existencias to vexor_runtime;
