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

Fuentes ejecutables: `backend/supabase/migrations/20261020000100_nucleo.sql` y `backend/supabase/migrations/20261020000300_backend_acceso.sql`. Se reutilizan estas migraciones aplicadas; cualquier cambio posterior debe escribirse en una nueva migración.

**Conclusión de diseño inicial:** el alcance básico ya tiene persistencia. No se justifica crear nuevas tablas ni migraciones solo para iniciar este bloque. Esta conclusión no cierra las reglas de negocio todavía pendientes ni acredita funcionamiento de pantallas que aún no existen.

## Reglas que requieren definición antes de su función

- Matriz inicial de permisos y quién puede asignarlos. Actualmente la gestión de equipo, roles, asignaciones e invitaciones está reservada al propietario; no hay una matriz comercial predefinida aprobada.
- Activación/desactivación y cambio de uso de locales. Ya existe soporte técnico de estados y conservación de registros; falta concretar el comportamiento de negocio que se ofrecerá en la interfaz. No suponer reglas sobre existencias o movimientos de módulos futuros.

## Backend de configuración

Se conserva la API del núcleo y sus reglas existentes. Tras la [reorganización aprobada](ESTRUCTURA_PROYECTO.md), `MeService` se encarga de identidad y membresías propias en `backend/src/compartido/autenticacion/`; `BusinessService`, `LocalsService` y `TeamService` están en sus funcionalidades de `backend/src/comerciante/`. `authorization.ts` comparte las comprobaciones de propietario, acceso propio/al equipo y local asignado, reutilizando los evaluadores de PostgreSQL. `InvitationsService` conserva el flujo durable de invitación en el área compartida y usa esa misma comprobación de propietario; los controladores del proveedor y del comerciante permanecen separados.

### Consultas individuales

Base: `/api/v1/negocios/:negocioId`. Bearer obligatorio y membresía activa verificada en cada transacción.

| Ruta añadida | Respuesta y acceso |
| --- | --- |
| `GET .../locales/:id` | Ficha del local: identidad, negocio, nombre, estado, habilitación de venta y fechas. Propietario: incluye inactivos. Trabajador: local activo asignado y permiso efectivo de consulta o gestión. |
| `GET .../miembros/:miembroId` | Identidad de membresía y usuario, nombre, propiedad, estado y fecha de incorporación. Acceso propio o permiso `equipo.ver`; sin correo Auth ni credenciales. |
| `GET .../roles/:id` | Identidad, negocio, nombre, estado y fechas. Requiere `equipo.ver`; las acciones del rol se consultan mediante la ruta existente `GET .../roles/:id/permisos`. |

Un recurso inexistente o de otro negocio no se devuelve. Las referencias inaccesibles pueden responder 403 o 404 según falte permiso de la acción o el recurso no esté dentro del contexto permitido. Los controles del servicio se complementan con las políticas RLS existentes.

### Paginación compartida

Las listas de negocios propios, locales, miembros, roles, asignaciones, permisos individuales, auditoría e invitaciones conservan `items`, `limit` y `offset` y añaden `has_more`. La consulta obtiene como máximo `limit + 1` filas autorizadas y devuelve solo `limit`: la fila adicional permite saber si quedan resultados sin contar ni revelar registros de otros accesos. El siguiente `offset` es el anterior más `limit`. Se conservan los límites técnicos actuales: `limit` de 1 a 100 y `offset` de 0 a 100000.

`GET .../acceso` mantiene su estructura con `locales` y añade igualmente `has_more`, referido exclusivamente a esa lista. Las listas pequeñas completas, como las acciones de un rol o el catálogo de permisos, conservan su respuesta sin paginar. Las altas y asignaciones siguen usando sus contratos existentes.

### Validaciones y errores para la interfaz

- Omitir un campo de edición conserva su valor. Un PATCH vacío responde 400. `null` se rechaza para nombres, zona horaria, estados, efecto e inicio de un permiso; solo se acepta en los campos anulables ya definidos, como fin de vigencia, motivo o alcance local opcional.
- Los instantes de permisos requieren fecha y hora ISO 8601 con `Z` o desplazamiento `±HH:MM`; se rechazan fechas sin hora o sin zona para evitar interpretaciones según la conexión SQL. La base mantiene la comprobación del intervalo.
- Se conservan los nombres libres, roles propios de cada negocio y asignaciones configurables. No se incorporan campos obligatorios del piloto ni una clasificación rígida de rubros. Atributos de productos y variantes corresponden al bloque de catálogo.
- Un segundo puesto activo de venta responde 409 con `LIMITE_PUESTOS_ACTIVOS`; un nombre de rol duplicado, 409 con `NOMBRE_ROL_DUPLICADO`. Son traducciones acotadas de las restricciones existentes, sin exponer nombres internos ni SQL.

Las reglas pendientes de la sección anterior siguen abiertas: esta revisión conserva el comportamiento del núcleo, sin aprobar una matriz comercial predefinida ni una política nueva de cambios de uso de locales.

### Frontend pendiente

El frontend comercial actual muestra información del negocio y acceso, selección de negocio y aceptación de invitaciones. Las pantallas de edición y gestión de este bloque siguen pendientes. Deben consumir las operaciones existentes y nuevas sin duplicar la autorización ni las reglas en la interfaz. El contrato OpenAPI actualizado se genera en `docs/api/openapi.json`; detalla rutas y entradas, y esta sección complementa la semántica de las respuestas.

## Verificación local

- `npm run db:test`: correcto; las tres migraciones se aplican desde cero, con 71 comprobaciones del núcleo, 23 de invitaciones y comprobación de limpieza del contexto al reutilizar conexión.
- `npm run db:test:postgres`: correcto; repite las comprobaciones en PostgreSQL nativo y verifica dos bajas concurrentes de propietarios en READ COMMITTED y REPEATABLE READ, conexión Kysely/pg restringida, rollback y limpieza del pool. El intento en el entorno restringido se interrumpió al no terminar; la ejecución fuera de esa restricción completó la suite.
- `npm run test:api`: 215 comprobaciones HTTP/integración correctas. Incluye las regresiones del núcleo y el recorrido adicional en `backend/tests/support/configuration.ts`: fichas individuales, aislamiento, acceso propio, valores nulos, instantes inequívocos, rol personalizado para un negocio de flores/regalos, alcance local frente a permisos de negocio, desactivación/vaciado de rol, asignación explícita de locales, denegación/revocación y paginación. PostgreSQL nativo desechable y Auth local controlado con JWT firmados; ningún correo real enviado.
- `npm run typecheck`: correcto para backend, scripts y frontend.
- `npm run test:web`: 20 pruebas correctas en seis archivos; regresión de los consumidores actuales del API.
- Reorganización: las mismas pruebas vuelven a pasar desde `backend/` y `frontend/`; la suite HTTP alcanza 216 comprobaciones al añadir la compatibilidad de ruta del certificado. Compilación de ambas salidas y comprobación del paquete público correctas.

Las pruebas usan bases locales desechables. El backend revisado no requiere migraciones nuevas y no modifica Supabase ni publica cambios en Vercel o Render. Los resultados locales de `test-results/` no se versionan. La entrega/recuperación de correo para clientes externos sigue necesitando la configuración y verificación SMTP pendientes del proyecto.
