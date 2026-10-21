# Demo pública — 20 de octubre de 2026

Rama `codex/demo-vercel`. Frontend React/Vite en [Vercel](https://vexor-robertoc1006.vercel.app); monolito Nest en [Render](https://vexor-api-robertoc1006.onrender.com/api/v1/health). La base sigue siendo vexor-dev; no se creó otra base ni se volvió a aprovisionar SQL.

## Configuración aplicada

- Render: servicio `vexor-api-robertoc1006`, plan Free, Oregon, Node 22.23.3, build API y `npm start`. Health check `/api/v1/health/ready`. Cuenta SQL restringida y clave secreta Supabase en variables privadas, con autorización expresa del usuario. Sin credenciales de migración. TLS verifica servidor y CA pública versionada.
- Vercel: proyecto `vexor-robertoc1006`, Hobby, raíz del repositorio, build exclusivo de la PWA, salida `dist/web`. Las únicas variables añadidas son URL y clave pública de Supabase. Rewrite externo `/api/v1/*` hacia Render; sin función Nest duplicada.
- Ambos servicios siguen `codex/demo-vercel`. Se verificó el despliegue Vercel `CZy8hUoT6B7yfrt56yHwv6ii5eun`, commit `02f4c4f`, estado Ready/Production; Render ya había verificado `a443bd9` como Live y sigue las actualizaciones de la misma rama.
- Supabase Auth: Site URL `https://vexor-robertoc1006.vercel.app`, callback exacto `/auth/callback` en ese origen y callback local conservado. Cambio autorizado expresamente y guardado desde el Dashboard. El backend utiliza el mismo origen y redirect.

El primer intento de Render tomó `main` y fue cancelado antes de sustituir la rama. El primer build de la rama en Vercel detectó que el patrón `src/` de `.vercelignore` también excluía `web/src`; se eliminó ese patrón y se confirmó el build remoto posterior. No se alteró `main` ni se hizo merge.

## Evidencia comprobada

- `npm run typecheck` y `npm run build`: correctos. El build público local no contiene los secretos locales; manifest, iconos y exclusiones del worker correctos.
- `test:hosting` contra Render y contra el dominio público Vercel: health 200, SQL ready 200 y `/me` 401 sin sesión; respuestas JSON y `Cache-Control: private, no-store`. Pruebas de lectura, sin altas ni envíos de correo.
- HTTP público: rutas profundas `/plataforma`, `/negocios` y `/auth/callback` devuelven la SPA; manifest standalone, worker y assets disponibles. Búsqueda de valores secretos locales en los assets comprobados: sin coincidencias. CORS devuelve el origen público exacto, no concede autorización CORS a un origen ajeno; Swagger `/docs` devuelve 404 en producción. Frontend con `nosniff` y `X-Frame-Options: DENY`.
- Navegador HTTPS: el usuario inició sesión personalmente, sin proporcionar la contraseña al agente. Se vio la administración SaaS con Roberto Risco; cambio al área de negocio, una membresía de propietario, apertura de «Negocio demo VEXOR» y datos/permisos cargados desde la API. Tras recargar la ruta del dashboard, la sesión y el contexto se conservaron.
- Vista móvil de acceso y dashboard a viewport solicitado de 390 × 844: ancho del documento y scroll iguales (375 px útiles, sin desbordamiento horizontal). Navegación inferior presente. Se restableció el viewport al terminar. No equivale a probar instalación en un teléfono físico.
- Capturas locales ignoradas en `test-results/`: `vercel-demo-publicada.png`, `auth-https-configurado.png`, `pwa-publica-movil.png`, `negocio-publico-movil.png` y `demo-publica-verificada.png`.
- Los commits de despliegue se revisaron contra los valores secretos locales sin imprimirlos. La comprobación inicial de staging no contemplaba archivos eliminados; se corrigió el comprobador local y se volvió a comprobar el commit publicado: cero coincidencias. No se versionaron archivos `.env` ni evidencia local.

## Límites y pendientes

La demo utiliza planes gratuitos; Render puede suspenderse por inactividad y tardar en despertar. Antes del lanzamiento comercial hay que elegir los planes apropiados y validar disponibilidad/carga. No se contrató ningún plan pagado.

SMTP personalizado sigue pendiente. En la sesión pública se observaron solicitudes existentes y un estado de correo aceptado por el proveedor; esto no certifica entrega al buzón ni recuperación. No se enviaron correos de diagnóstico ni se alteraron esas solicitudes durante este despliegue. La prueba pública de contraseña fue inicio de sesión, no recuperación ni un nuevo flujo de invitación.

`npm audit --omit=dev` reportó dos avisos moderados relacionados (`@nestjs/swagger` y `js-yaml`, GHSA-r3ph-w7gj-g6xm). Swagger está desactivado en producción y no se añadió procesamiento YAML de usuarios; queda revisar una actualización compatible en el bloque de dependencias. No se ejecutó `audit fix --force`.

Ventas, inventario, sincronización offline y locales configurables por interfaz siguen fuera de esta fase. No se afirma instalación física PWA, correo general ni preparación completa para producción.
