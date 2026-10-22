alter table app.categorias
  add column ejes_variantes text[] not null default '{}'::text[]
    check (app_private.ejes_validos(ejes_variantes));
grant update(ejes_variantes) on app.categorias to vexor_runtime;
