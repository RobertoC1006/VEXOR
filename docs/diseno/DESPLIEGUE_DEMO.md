# Demo: Vercel y Render

Decisión del usuario del 20 de octubre de 2026: PWA en Vercel y backend en Render. Sustituye el alojamiento conjunto en Vercel. La primera demo se publicó desde `codex/demo-vercel`; el usuario aprobó después usar `main` como rama estable de publicación.

Destinos configurados: PWA `https://vexor-robertoc1006.vercel.app`; API `https://vexor-api-robertoc1006.onrender.com`. Supabase Auth ya tiene Site URL público y callback exacto, conservando el callback local. Render respondió correctamente a las comprobaciones HTTP de salud, SQL y sesión requeridas. La verificación del recorrido autenticado público se registra por separado.

## Render

Servicio Node desde la raíz del repositorio. Configuración reproducible en `render.yaml`; Node 22, build `npm ci --include=dev && npm run build:api`, inicio `npm start`, health check `/api/v1/health/ready`. Render suministra `PORT`; `HOST=0.0.0.0` permite escuchar en su interfaz.

Variables privadas: `DATABASE_URL` de la cuenta restringida existente, `DATABASE_POOL_MAX=2`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NODE_ENV=production`, `HOST=0.0.0.0`, `APP_ORIGINS` con origen HTTPS exacto y `INVITATION_REDIRECT_URL` con `/auth/callback`. No configurar `MIGRATION_DATABASE_URL`, ni ejecutar aprovisionamiento o migraciones al arrancar. Mantener `sslmode=verify-full` y `sslrootcert=supabase/certs/prod-ca-2021.crt` relativo a la raíz Linux. El certificado público está versionado.

El plan Free es para esta demo: puede suspenderse por inactividad y provocar arranque lento. No ofrece las garantías de disponibilidad de un servicio permanente. No se contrata ningún plan pagado automáticamente.

## Vercel

Preset Other, raíz del repositorio, build `npm run build:web`, salida `dist/web`. Variables: exclusivamente `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. No copiar el `.env` completo. Se retiró el adaptador serverless para evitar desplegar un segundo backend.

`vercel.json` usa rewrite externo hacia Render, conserva las rutas SPA y marca API `private, no-store`. El navegador usa `/api/v1` del mismo origen. Al cambiar de servicio Render debe actualizarse el destino del rewrite. No activar caché de respuestas autenticadas.

La rama de producción de ambos servicios es `main`. Los siguientes bloques se desarrollan en ramas `codex/` creadas desde `main`, se prueban y revisan antes de integrar su publicación aprobada. Un push a una rama de trabajo no actualiza por sí mismo el backend público; los previews de frontend tampoco crean un backend aislado. Los previews alternativos no se añaden a Auth con comodines.

Vercel y Render despliegan independientemente tras el push a `main`; todavía no existe una promoción coordinada ni una batería completa de pruebas automática que bloquee ambos despliegues. Preparar cambios de API compatibles durante esa transición y comprobar los dos servicios. `render.yaml` documenta la configuración; este servicio se creó desde Dashboard, por lo que la rama también se cambia en sus Settings.

Referencia de recuperación previa a la transición: rama conservada `codex/demo-vercel`, commit `0cf850e`. No se elimina ni se reescribe. Los cambios de base de datos requieren su propio procedimiento; volver a una versión de código no revierte migraciones.

## Auth y verificación

Registrar en Supabase Auth el Site URL HTTPS definitivo y su callback exacto, conservando localhost para desarrollo. El backend debe usar ese mismo origen y callback. La sesión de localhost no se transfiere al dominio público: el usuario inicia sesión personalmente allí.

`VEXOR_SMOKE_ORIGIN=https://<destino> npm run test:hosting` comprueba sin mutaciones health, conexión SQL, rechazo 401 sin sesión, JSON y ausencia de caché. Ejecutarlo contra Render y Vercel. Desde navegador verificar acceso, retorno Auth, las dos áreas y cambio de negocio; no pedir contraseñas por chat.

SMTP personalizado sigue pendiente; el despliegue no implica entrega de invitaciones o recuperación para clientes externos. La base `vexor-dev` conserva los datos existentes.
