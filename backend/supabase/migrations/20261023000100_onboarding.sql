-- Existing businesses keep their access; only new businesses start the assistant.
alter table app.negocio_perfil add column onboarding_paso smallint not null default 3
 check (onboarding_paso between 0 and 3);
create function app_private.iniciar_onboarding() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into app.negocio_perfil(negocio_id,onboarding_paso) values(new.id,0);
 return new;
end $$;
revoke all on function app_private.iniciar_onboarding() from public;
create trigger negocio_onboarding after insert on app.negocios
 for each row execute function app_private.iniciar_onboarding();
