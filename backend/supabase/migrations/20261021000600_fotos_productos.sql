alter table app.productos add column foto_version integer not null default 0 check (foto_version >= 0);
grant update(foto_version) on app.productos to vexor_runtime;
create table app.productos_fotos (
  negocio_id uuid not null,
  producto_id uuid not null,
  imagen text not null check (char_length(imagen) between 28 and 20000 and imagen ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'),
  primary key (negocio_id, producto_id),
  foreign key (negocio_id, producto_id) references app.productos(negocio_id, id) on delete cascade
);
alter table app.productos_fotos enable row level security;
alter table app.productos_fotos force row level security;
create policy fotos_lectura on app.productos_fotos for select to vexor_runtime using
  (negocio_id = app_private.negocio_id() and (app_private.puede('productos.ver') or app_private.puede('productos.gestionar')));
create policy fotos_escritura on app.productos_fotos for all to vexor_runtime using
  (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar')) with check
  (negocio_id = app_private.negocio_id() and app_private.puede('productos.gestionar') and exists
    (select 1 from app.productos p where p.negocio_id = productos_fotos.negocio_id and p.id = productos_fotos.producto_id and p.producto_padre_id is null));
grant select, insert, update, delete on app.productos_fotos to vexor_runtime;
