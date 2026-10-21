# Demo: Vercel y Render

Decisión del usuario del 20 de octubre de 2026: PWA en Vercel y backend en Render. Sustituye el alojamiento conjunto en Vercel. Rama de esta fase: `codex/demo-vercel`.

Destinos configurados: PWA `https://vexor-robertoc1006.vercel.app`; API `https://vexor-api-robertoc1006.onrender.com`. Supabase Auth ya tiene Site URL público y callback exacto, conservando el callback local. Render respondió correctamente a las comprobaciones HTTP de salud, SQL y sesión requeridas. La verificación del recorrido autenticado público se registra por separado.

## Render

Servicio Node desde la raíz del repositorio. Configuración reproducible en `render.yaml`; Node 22, build `npm ci --include=dev && npm run build:api`, inicio `npm start`, health check `/api/v1/health/ready`. Render suministra `PORT`; `HOST=0.0.0.0` permite escuchar en su interfaz.

Variables privadas: `DATABASE_URL` de la cuenta restringida existente, `DATABASE_POOL_MAX=2`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NODE_ENV=production`, `HOST=0.0.0.0`, `APP_ORIGINS` con origen HTTPS exacto y `INVITATION_REDIRECT_URL` con `/auth/callback`. No configurar `MIGRATION_DATABASE_URL`, ni ejecutar aprovisionamiento o migraciones al arrancar. Mantener `sslmode=verify-full` y `sslrootcert=supabase/certs/prod-ca-2021.crt` relativo a la raíz Linux. El certificado público está versionado.

El plan Free es para esta demo: puede suspenderse por inactividad y provocar arranque lento. No ofrece las garantías de disponibilidad de un servicio permanente. No se contrata ningún plan pagado automáticamente.

## Vercel

Preset Other, raíz del repositorio, build `npm run build:web`, salida `dist/web`. Variables: exclusivamente `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. No copiar el `.env` completo. Se retiró el adaptador serverless para evitar desplegar un segundo backend.

`vercel.json` usa rewrite externo hacia Render, conserva las rutas SPA y marca API `private, no-store`. El navegador usa `/api/v1` del mismo origen. Al cambiar de servicio Render debe actualizarse el destino del rewrite. No activar caché de respuestas autenticadas.

La rama de producción de ambos servicios debe ser la de esta fase; importar `main` no publica este trabajo. Los previews alternativos no se añaden a Auth con comodines.

## Auth y verificación

Registrar en Supabase Auth el Site URL HTTPS definitivo y su callback exacto, conservando localhost para desarrollo. El backend debe usar ese mismo origen y callback. La sesión de localhost no se transfiere al dominio público: el usuario inicia sesión personalmente allí.

`VEXOR_SMOKE_ORIGIN=https://<destino> npm run test:hosting` comprueba sin mutaciones health, conexión SQL, rechazo 401 sin sesión, JSON y ausencia de caché. Ejecutarlo contra Render y Vercel. Desde navegador verificar acceso, retorno Auth, las dos áreas y cambio de negocio; no pedir contraseñas por chat.

SMTP personalizado sigue pendiente; el despliegue no implica entrega de invitaciones o recuperación para clientes externos. La base `vexor-dev` conserva los datos existentes.
