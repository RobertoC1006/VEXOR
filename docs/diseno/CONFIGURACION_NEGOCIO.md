# Configuración del negocio — bloque 2

## Alcance y orden acordados

El usuario aprobó continuar desde el núcleo publicado con Mi negocio, Puestos y almacenes y Equipo. Primero se revisa/completa la base de datos, después el backend y finalmente el frontend. Rama: `codex/configuracion-negocio`, creada desde `main` sincronizado con `origin/main`.

El objetivo es que el propietario edite los datos básicos del negocio, registre y edite sus locales, invite trabajadores y gestione sus accesos, permisos y locales desde la interfaz. El bloque no incorpora catálogo, inventario, ventas ni suscripción comercial.

## Revisión inicial de base de datos

La revisión del esquema y sus restricciones identifica estas capacidades existentes:

| Necesidad del bloque | Solución ya implementada |
| --- | --- |
| Editar datos básicos | `app.negocios`: nombre y zona horaria; permiso `negocio.editar`. El estado del servicio queda reservado a la plataforma. |
| Registrar puestos y almacenes | `app.locales`: nombre, estado y habilitación de venta. Todo local puede almacenar; el índice `un_puesto_activo_basico` limita a uno los locales activos habilitados para venta por negocio. |
| Incorporar equipo | `app_private.invitaciones_acceso` y funciones de solicitud, envío, revocación y aceptación; aceptación de equipo crea membresía sin propiedad ni locales implícitos. |
| Gestionar accesos | `app.miembros_negocio`, `app.roles`, `app.roles_permisos`, `app.miembros_roles`, `app.miembros_locales` y `app.permisos_otorgados`. |
| Proteger la configuración | RLS, claves compuestas por negocio, al menos un propietario activo y auditoría transaccional de cambios. |

Fuentes ejecutables: `supabase/migrations/20261020000100_nucleo.sql` y `supabase/migrations/20261020000300_backend_acceso.sql`. Se reutilizan estas migraciones aplicadas; cualquier cambio posterior debe escribirse en una nueva migración.

**Conclusión de diseño inicial:** el alcance básico ya tiene persistencia. No se justifica crear nuevas tablas ni migraciones solo para iniciar este bloque. Esta conclusión no cierra las reglas de negocio todavía pendientes ni acredita funcionamiento de pantallas que aún no existen.

## Reglas que requieren definición antes de su función

- Matriz inicial de permisos y quién puede asignarlos. Actualmente la gestión de equipo, roles, asignaciones e invitaciones está reservada al propietario; no hay una matriz comercial predefinida aprobada.
- Activación/desactivación y cambio de uso de locales. Ya existe soporte técnico de estados y conservación de registros; falta concretar el comportamiento de negocio que se ofrecerá en la interfaz. No suponer reglas sobre existencias o movimientos de módulos futuros.

## Continuación del backend y frontend

Reutilizar `CoreController`, `CoreService` e `InvitationsService`: ya exponen edición de negocio, locales, miembros, roles, permisos e invitaciones. Revisar sus contratos y respuestas para la interfaz antes de ampliarlos. Mantener la autorización en servidor y las protecciones RLS; ocultar botones no sustituye los permisos.

El frontend comercial actual muestra información del negocio y acceso, selección de negocio y aceptación de invitaciones. Las pantallas de edición y gestión de este bloque siguen pendientes.

## Verificación local

- `npm run db:test`: correcto; las tres migraciones se aplican desde cero, con 71 comprobaciones del núcleo, 23 de invitaciones y comprobación de limpieza del contexto al reutilizar conexión.
- `npm run db:test:postgres`: correcto; repite las comprobaciones en PostgreSQL nativo y verifica dos bajas concurrentes de propietarios en READ COMMITTED y REPEATABLE READ, conexión Kysely/pg restringida, rollback y limpieza del pool. El intento en el entorno restringido se interrumpió al no terminar; la ejecución fuera de esa restricción completó la suite.

Las pruebas usan bases locales desechables. Este inicio del bloque no modifica Supabase ni publica cambios en Vercel o Render. Los resultados locales de `test-results/` no se versionan.
