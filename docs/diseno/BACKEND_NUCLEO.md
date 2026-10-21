# Backend del núcleo — bloque 2

Fecha: 20 de octubre de 2026. Rama de trabajo: `codex/backend-nucleo`.

## Alcance implementado

Monolito NestJS 11 / Express 5 / TypeScript sobre Kysely y `pg`. Integra la base del primer bloque: identidad, pertenencia, copropiedad, locales, roles, permisos individuales y auditoría de acceso. Incluye el alta por invitación del propietario y la incorporación de trabajadores. No implementa productos, ventas, inventario, sincronización offline ni pantallas de la PWA.

El usuario confirmó correo e invitación personal para incorporar propietarios y trabajadores. Las otras reglas vigentes se conservan: varios copropietarios, locales expresamente asignados a trabajadores y permisos individuales positivos/negativos. No se siembra una matriz comercial predeterminada de vendedor/encargado/administrador.

## Identidad y autorización

La PWA iniciará sesión y establecerá la contraseña mediante Supabase Auth. Envía el access token en `Authorization: Bearer <token>` a NestJS. El backend no guarda contraseñas ni emite otro sistema de sesiones.

`AuthService` consulta `supabase.auth.getUser(token)` con la clave pública del proyecto y comprueba cuenta autenticada, UUID válido, correo confirmado y ausencia de sesión anónima. La comprobación de firma/vigencia corresponde al servidor Auth. No se confía en `getSession()` del cliente ni en `user_metadata` para conceder acceso. Una indisponibilidad del proveedor devuelve 503; un token no válido, 401. No se promete invalidación instantánea de todos los access tokens después de un cierre de sesión; su ciclo lo administra Supabase Auth.

La pertenencia y los permisos comerciales se verifican nuevamente en PostgreSQL dentro de cada transacción. El negocio de la URL es una selección solicitada, no una autorización. El actor y su correo se obtienen de la identidad verificada, nunca del cuerpo o de un encabezado de rol. Al terminar la transacción se limpian actor, correo, negocio y rol.

`assertRuntimeConnection` rechaza superusuario, BYPASSRLS, creación de roles/bases, replicación, herencia o membresías SQL adicionales. Requiere que la cuenta pueda asumir únicamente `vexor_runtime`, sin ADMIN OPTION. La conexión remota usa TLS con verificación del certificado (`sslmode=verify-full`); no se degrada para eludir errores de certificados.

Los cuerpos desconocidos se rechazan; nombres y tipos se validan con DTOs. Las listas principales usan `limit` de 1–100 (25 por defecto) y `offset` de 0–100000. Las consultas y referencias siguen acotadas al negocio. El API no devuelve errores SQL, parámetros de consultas ni credenciales.

## Administración de VEXOR y alta por correo

La migración `20261020000300_backend_acceso.sql` añade dos tablas de control en `app_private`, ambas con RLS habilitado y forzado y sin SELECT directo para runtime o roles de la API:

| Tabla | Función |
| --- | --- |
| `administradores_plataforma` | Lista explícita de identidades Auth autorizadas para solicitar altas. No se edita desde HTTP ni mediante roles comerciales. |
| `invitaciones_acceso` | Solicitud durable, destinatario, tipo de alta, expiración, solicitante, estado del envío, lease, aceptación y revocación. |

El runtime accede exclusivamente a funciones delimitadas. `mis_negocios()` descubre las membresías del propio actor antes de elegir un tenant. Las funciones de invitación comprueban administrador/propietario/destinatario según corresponda. El administrador puede gestionar altas; no recibe por ello membresía ni acceso comercial.

Flujo del alta de negocio:

1. Un administrador autorizado solicita el alta con nombre de negocio, zona horaria, correo y nombre del propietario. La solicitud se confirma en la base antes de contactar al servicio de correo.
2. Supabase Auth envía la invitación a una identidad nueva. Si la dirección ya tiene cuenta, se envía un enlace de acceso sin crear otra identidad ni cambiar su contraseña.
3. La futura pantalla `/auth/callback` de la PWA procesa el enlace; permite a la persona nueva establecer su contraseña y obtiene la sesión confirmada.
4. El destinatario consulta sus invitaciones y acepta desde una sesión con ese correo confirmado. Una sola transacción crea perfil, negocio y membresía propietaria, y marca la aceptación. La protección del último propietario sigue vigente.
5. Aceptaciones repetidas o simultáneas devuelven el mismo negocio y miembro. El administrador no se incorpora al negocio y no se crean puestos ficticios.

El propietario invita al equipo dentro de su negocio mediante el mismo mecanismo; la aceptación crea un trabajador, sin rol, local o copropiedad implícitos. Después se configuran esas asignaciones con los endpoints correspondientes. Una identidad existente conserva su perfil; la invitación no reactiva una membresía o perfil bloqueado. Si el solicitante dejó de estar autorizado, la invitación pendiente no permite una nueva incorporación.

## Envíos, reintentos y vencimiento

`Idempotency-Key` es un UUID obligatorio al crear una invitación. Misma clave, actor y contenido recuperan la solicitud; otra carga con esa clave produce 409. La identidad de la invitación coincide con esa clave. No se reutilizan claves para otra solicitud.

El correo se envía **fuera de la transacción SQL**. Un lease de dos minutos evita envíos paralelos normales; solo el actor y lease correctos pueden finalizar su registro. Los errores quedan como `auth_temporal`, `auth_rechazada` o `auth_no_configurado`. La respuesta 202 significa que la solicitud quedó guardada, no que el destinatario ya recibió el mensaje. `estado_envio=enviado` indica aceptación del proveedor.

No se necesita un cron ni servicio adicional: un reintento de la misma solicitud o el endpoint de reenvío reanuda el trabajo. El reenvío tiene una espera mínima técnica de un minuto. Tras una caída en el límite entre entrega y confirmación puede repetirse un correo; la aceptación y el alta siguen siendo únicas. No se afirma entrega exactamente una vez.

La invitación de acceso tiene vigencia técnica de siete días, independiente del plazo más corto de un enlace de Supabase Auth y de los permisos temporales del negocio. Para renovar una solicitud vencida se revoca y se crea otra con nueva clave. Revocar una invitación aceptada no da de baja al trabajador: se gestiona su membresía.

El servicio SMTP incluido por defecto en Supabase restringe destinatarios al equipo del proyecto. Para invitar trabajadores con otras direcciones se necesita configurar SMTP personalizado en Supabase Auth. Esta configuración y el callback de la PWA deben estar listos antes de usar invitaciones reales. [Documentación SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## API

Base: `/api/v1`. Las rutas protegidas requieren Bearer. Los UUID de negocio, miembro, rol, local o concesión son parámetros de ruta; no se aceptan cambios de identidad o negocio en cuerpos de edición.

| Rutas | Función / autorización |
| --- | --- |
| `GET /health`, `GET /health/ready` | Estado del proceso y disponibilidad SQL, sin revelar configuración. |
| `GET /me`, `PATCH /me` | Identidad/perfil propio y edición de su nombre. |
| `GET /me/negocios` | Listado de las membresías activas propias. |
| `GET /me/invitaciones`, `POST /me/invitaciones/:id/aceptar` | Pendientes del correo confirmado y aceptación idempotente. |
| `GET/PATCH /negocios/:negocioId` | Contexto del negocio; editar requiere `negocio.editar`. |
| `GET /negocios/:negocioId/acceso` | Membresía, acciones efectivas y locales autorizados paginados. |
| `GET/POST /negocios/:negocioId/locales`, `PATCH .../locales/:id` | Lectura con RLS; crear solo propietario; edición delegada requiere permiso y local asignado. |
| `GET .../miembros`, `PATCH .../miembros/:miembroId` | Consultar equipo con permiso; editar acceso/propiedad solo propietario. |
| `GET/POST .../roles`, `PATCH .../roles/:id` | Consultar con `equipo.ver`; gestionar solo propietario. |
| `GET/PUT .../roles/:id/permisos` | Consultar o reemplazar atómicamente las acciones de un rol. |
| `GET/POST .../miembros/:miembroId/roles`, `DELETE .../miembros/:miembroId/roles/:id` | Asignaciones de rol, con alcance local opcional. |
| `GET/PUT .../miembros/:miembroId/locales` | Consultar o reemplazar las asignaciones de locales. |
| `GET .../permisos` | Catálogo de las cuatro acciones actuales. |
| `GET/POST .../miembros/:miembroId/permisos` | Consultar excepciones propias o equipo autorizado; conceder/denegar solo propietario. |
| `PATCH .../miembros/:miembroId/permisos/:id`, `POST .../permisos/:id/revocar` | Editar vigencia/efecto/motivo o revocar sin borrar historial. |
| `GET .../auditoria` | Lectura paginada solo para propietarios. |
| `GET/POST .../invitaciones`, `POST .../invitaciones/:id/reenviar`, `POST .../invitaciones/:id/revocar` | Incorporación del equipo, solo propietario. |
| `GET/POST /plataforma/invitaciones-negocio` y acciones `/:id/reenviar`, `/:id/revocar` | Altas solicitadas por administradores explícitos de VEXOR. |

En las rutas abreviadas, `...` significa `/negocios/:negocioId`; para revocar un permiso individual también se conserva el tramo `/miembros/:miembroId`.

Swagger está disponible en `/docs` y `/docs-json` en desarrollo. El [OpenAPI generado](../api/openapi.json) documenta rutas, entradas, Bearer y claves de idempotencia; la semántica de autorización y los flujos se describen aquí. No se publica Swagger en `NODE_ENV=production`.

Estados principales: 200 lectura/edición/acciones, 201 creación de recursos, 202 invitación guardada, 400 datos/referencias inválidos, 401 sesión inválida, 403 acceso denegado, 404 recurso ausente en el contexto autorizado, 409 conflicto/regla de integridad o reintento de transacción. Los errores incluyen `requestId` y un código acotado.

## Arranque y configuración

```powershell
npm ci
npm run build
# Completar .env a partir de .env.example; no usar postgres para DATABASE_URL.
npm start
```

`npm start` carga `.env` y luego `.env.runtime`, ambos ignorados por Git. Las variables reales del proceso tienen prioridad. Configurar URL/clave pública de Supabase, orígenes de la PWA y la cuenta PostgreSQL restringida. El envío requiere además la clave secreta Auth y el redirect permitido. No se envían correos al arrancar el servidor.

Una cuenta SQL de desarrollo puede aprovisionarse mediante `backend/scripts/provision-runtime.ts`, invocación administrativa explícita y separada de NestJS:

```powershell
# MIGRATION_DATABASE_URL administrativa solo en el entorno local de aprovisionamiento.
$env:VEXOR_PROVISION_TARGET='development'
npm run db:provision-runtime
```

El script crea `vexor_backend` con los atributos mínimos, genera una contraseña y la guarda en `.env.runtime` sin imprimirla. No sustituye roles o archivos existentes. Si el resultado del commit no se pudo confirmar, conserva la credencial para verificarlo sin perderla. El script también reconoce la forma `usuario.referencia` de los poolers de Supabase. Usar conexión directa o pooler de sesión para migraciones y aprovisionamiento. Si se necesita una CA específica, configurar `sslrootcert` o el almacén de certificados de Node; no desactivar la verificación TLS.

La cuenta de desarrollo ya está aprovisionada en `vexor-dev` y se comprobó el arranque local. La conexión utiliza el pooler de sesión y `sslmode=verify-full&sslrootcert=backend/supabase/certs/prod-ca-2021.crt`. Esta CA pública procede del enlace **Download certificate** en Database / Settings del Dashboard. El archivo está versionado; la contraseña generada permanece únicamente en `.env.runtime`. No volver a ejecutar el aprovisionamiento para arrancar el servidor.

Para habilitar el primer administrador, crear/confirmar su identidad en Supabase Auth y ejecutar explícitamente:

```powershell
$env:VEXOR_PROVISION_TARGET='development'
npm run db:bootstrap-admin -- UUID_AUTH_CONFIRMADO
```

Este comando requiere la conexión administrativa y solo registra una identidad ya existente. No envía un correo ni concede acceso comercial. No exponer `MIGRATION_DATABASE_URL` al proceso de tráfico en Render.

Despliegue acordado: Render. Preparación: Node 22+, `npm ci --include=dev && npm run build`, inicio `npm start`, `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT` suministrado por el alojamiento y secretos en variables del servicio. Health check: `/api/v1/health/ready`. No se ha creado un servicio Render ni contratado alojamiento en este bloque.

## Verificación y continuación

```powershell
npm run typecheck
npm run db:test
npm run db:test:postgres
npm run test:api
```

PostgreSQL portátil 17 se utiliza por defecto en Windows; Docker PostgreSQL 17 en otros sistemas. Puede elegirse `VEXOR_TEST_ENGINE=native` o `docker`. Los clústeres tienen contraseña aleatoria, escuchan solo en loopback y se eliminan al terminar. No se crean usuarios de Windows/Linux. Las pruebas Auth usan un servidor local controlado y JWT RS256 firmados; no envían correos reales.

Consultar [resultados y evidencia](../verificacion/BACKEND_2026-10-20.md) para distinguir las pruebas HTTP locales de las pruebas SQL ejecutadas en Supabase. La migración nueva se añadió sin reescribir las dos anteriores.

Después: habilitar una identidad confirmada como primer administrador mediante el comando explícito, configurar SMTP y callback de la PWA para un recorrido real; desplegar el backend en Render cuando se configure ese servicio; construir acceso y primeras pantallas. La venta offline y la matriz de acciones de otros módulos siguen pendientes de sus bloques.
