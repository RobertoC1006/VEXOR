-- Supabase postgres tiene BYPASSRLS, pero no es superusuario.
-- CREATE ROLE no le concede necesariamente SET ROLE en PostgreSQL 17.
-- Permite al administrador probar con las restricciones reales del runtime.
-- No concede privilegios de postgres al runtime ni habilita un nuevo login.
grant vexor_runtime to postgres;
