-- Datos comerciales configurables; la ubicación pertenece a cada local.
-- Los registros existentes siguen válidos sin inventar rubro ni ubicación.
alter table app.negocios add column rubro text
  check (rubro is null or (rubro = btrim(rubro) and char_length(rubro) between 1 and 120));

alter table app.locales
  add column mercado text check (mercado is null or (mercado = btrim(mercado) and char_length(mercado) between 1 and 160)),
  add column pabellon text check (pabellon is null or (pabellon = btrim(pabellon) and char_length(pabellon) between 1 and 80)),
  add column numero_puesto text check (numero_puesto is null or (numero_puesto = btrim(numero_puesto) and char_length(numero_puesto) between 1 and 40)),
  add column referencia text check (referencia is null or (referencia = btrim(referencia) and char_length(referencia) between 1 and 240));

grant update (rubro) on app.negocios to vexor_runtime;
grant update (mercado, pabellon, numero_puesto, referencia) on app.locales to vexor_runtime;
-- Se conservan RLS, autorización, fechas y auditoría de las tablas existentes.
