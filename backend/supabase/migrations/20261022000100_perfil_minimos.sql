create table app.negocio_perfil (
 negocio_id uuid primary key references app.negocios(id),
 descripcion text check (char_length(descripcion) <= 1000),
 foto text check (char_length(foto) <= 20000 and foto ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'),
 preferencias jsonb not null default '{}' check (jsonb_typeof(preferencias) = 'object')
);
alter table app.negocio_perfil enable row level security;
alter table app.negocio_perfil force row level security;
create policy perfil_lectura on app.negocio_perfil for select to vexor_runtime using (negocio_id = app_private.negocio_id());
create policy perfil_edicion on app.negocio_perfil for all to vexor_runtime using (negocio_id = app_private.negocio_id() and app_private.puede('negocio.editar')) with check (negocio_id = app_private.negocio_id() and app_private.puede('negocio.editar'));
grant select, insert, update on app.negocio_perfil to vexor_runtime;

create table app.stock_minimos (
 negocio_id uuid not null,
 local_id uuid not null,
 producto_id uuid not null,
 minimo integer check (minimo between 1 and 2147483647),
 version integer not null default 1 check (version > 0),
 primary key (negocio_id, local_id, producto_id),
 foreign key (negocio_id, local_id) references app.locales(negocio_id,id),
 foreign key (negocio_id, producto_id) references app.productos(negocio_id,id)
);
alter table app.stock_minimos enable row level security;
alter table app.stock_minimos force row level security;
create policy minimo_lectura on app.stock_minimos for select to vexor_runtime using (negocio_id = app_private.negocio_id() and app_private.accede_local(local_id) and (app_private.puede('inventario.ver',local_id) or app_private.puede('inventario.contar',local_id) or app_private.puede('inventario.confirmar',local_id)));
create policy minimo_escritura on app.stock_minimos for all to vexor_runtime using (negocio_id = app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('inventario.confirmar',local_id)) with check (negocio_id = app_private.negocio_id() and app_private.accede_local(local_id) and app_private.puede('inventario.confirmar',local_id) and exists (select 1 from app.productos p where p.negocio_id=stock_minimos.negocio_id and p.id=stock_minimos.producto_id and p.nivel_registro <> 'avanzado'));
create trigger audita_minimos after insert or update on app.stock_minimos for each row execute function app_private.audita_acceso();
grant select, insert, update on app.stock_minimos to vexor_runtime;
