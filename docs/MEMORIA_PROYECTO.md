# Memoria del proyecto VEXOR

Última actualización: 2026-10-21 (America/Lima).

## Propósito y estado actual

VEXOR será un SaaS multitenant para ayudar a comerciantes de mercados peruanos a gestionar sus negocios de forma sencilla y rápida desde el celular. El primer piloto será el negocio familiar de lencería del usuario. El diseño debe contemplar otros rubros desde su base: ropa, zapatos, abarrotes, juguetes, flores y otros.

El núcleo y el bloque 2 de configuración del negocio están implementados, aprobados y publicados como demo en `main` (commit funcional `068c1f1`). Incluyen PostgreSQL con RLS, backend NestJS y frontend React/TypeScript/Vite; acceso e invitaciones, áreas de proveedor y comerciante, información del negocio, locales y gestión del equipo. La aplicación consulta datos reales de `vexor-dev`; no simula ventas. La propuesta lógica de 60 tablas sigue siendo una referencia para los módulos restantes, no el esquema físico completo aprobado.

Para retomar, consultar según la tarea: [configuración del negocio terminada](diseno/CONFIGURACION_NEGOCIO.md), [alojamiento y publicación](#alojamiento-y-publicación-vigentes--confirmado), [base de datos del núcleo](diseno/NUCLEO_BASE_DATOS.md), [backend](diseno/BACKEND_NUCLEO.md), [frontend y dos áreas](diseno/FRONTEND_NUCLEO.md), [configuración del despliegue](diseno/DESPLIEGUE_DEMO.md) y [verificación pública inicial](verificacion/DESPLIEGUE_2026-10-20.md). El [modelo inicial de datos](diseno/MODELO_DATOS_INICIAL.md) sirve para revisar funciones posteriores; no usar los antiguos documentos de preparación como evidencia del estado implementado.

### Alojamiento y publicación vigentes — confirmado

| Componente | Destino actual |
| --- | --- |
| Frontend PWA | Vercel, proyecto `vexor-robertoc1006`, plan Hobby: https://vexor-robertoc1006.vercel.app |
| Backend monolítico | Render, servicio `vexor-api-robertoc1006`, plan Free, Oregon: https://vexor-api-robertoc1006.onrender.com/api/v1 |
| PostgreSQL y Auth | Supabase, proyecto `vexor-dev`, referencia `xlkuqntkxzwayyxovoxy` |
| Código y rama de publicación | GitHub `RobertoC1006/VEXOR`, rama `main` |

- `main` incluye el bloque de `codex/configuracion-negocio`, publicado por autorización expresa del usuario en el commit `068c1f1`: Vercel Ready/Production y Render Live con el mismo commit. La migración `20261021000100_rubro_ubicacion` quedó aplicada y registrada previamente en Supabase; existen cuatro migraciones del proyecto, con RLS conservado. `codex/demo-vercel` se conserva en `0cf850e` como referencia anterior. Una vuelta de código no revierte cambios de base de datos.
- El alojamiento vigente es frontend en Vercel y backend en Render. La alternativa anterior de alojar ambos en Vercel quedó sustituida. `vexor.vercel.app` no pudo asignarse porque ya pertenecía a otro proyecto; cambiar mayúsculas no crea otro dominio. No hay un dominio propio contratado/configurado.
- GitHub activa despliegues independientes al actualizar `main`. Las salidas publicadas son `dist/frontend` y `dist/backend`. Vercel conserva `npm run build:web`; Render instala dependencias, compila `build:api` y ejecuta `npm start`, con Node 22 y health check `/api/v1/health/ready`. Vercel reenvía `/api/v1/*` a Render mediante `vercel.json`. El servicio Render fue creado desde Dashboard; `render.yaml` documenta sus ajustes y no es un Blueprint activo.
- Las nuevas funcionalidades se trabajan en ramas `codex/` desde `main`; se prueban y revisan antes de integrar su publicación aprobada. Las instrucciones operativas de commit, push y merge están en `AGENTS.md`. Un preview de frontend no crea un backend ni una base aislados. Aún no hay pruebas completas automáticas que bloqueen ambos despliegues ni promoción coordinada.
- Auth tiene Site URL `https://vexor-robertoc1006.vercel.app` y callback exacto `https://vexor-robertoc1006.vercel.app/auth/callback`; se conserva `http://localhost:5173/auth/callback` para desarrollo. No autorizar comodines de previews. El backend usa ese origen público y callback.
- Los secretos SQL y Auth se guardan solo en las variables privadas de Render. Vercel recibe únicamente la URL y clave pública de Supabase. Conservar `.env` y `.env.runtime` locales sin mostrarlos ni versionarlos; no transferir la conexión de migración a Render ni volver a aprovisionar la cuenta SQL restringida. Los despliegues no ejecutan aprovisionamiento, migraciones ni altas de administrador.
- El primer administrador es Roberto Risco, con acceso SaaS y membresía propia de propietario en «Negocio demo VEXOR». Usa una sola cuenta y contraseña para las dos áreas; la administración SaaS no concede acceso comercial implícito. `/` lo dirige a `/plataforma`; el cambio de área conduce a `/negocios` y al dashboard autorizado.
- Publicación de configuración verificada en HTTPS: salud/SQL y rechazo 401 sin sesión contra Render y Vercel, API sin caché, paquete público con rubro/ubicaciones/bases de permisos, y acceso autenticado al negocio y su configuración. Tipos, build y revisión del paquete público correctos; 35 pruebas frontend y 232 comprobaciones HTTP/integración locales. Se comprobó presentación móvil, no instalación en teléfono físico. El recorrido público fue de lectura; no equivale a repetir todas las mutaciones de las pruebas locales sobre datos reales.
- **Pendientes de alojamiento:** SMTP personalizado y validación de entrega/recuperación para clientes externos; planes y capacidad para lanzamiento comercial; CI y entornos de prueba aislados. Son pendientes, no tareas autorizadas automáticamente. Render Free puede suspenderse por inactividad y el arranque puede superar el timeout actual de 20 segundos del frontend. No se contrató ningún plan pagado.
- **Fuera del bloque implementado:** productos/catálogo, inventario, ventas y sincronización offline. La PWA tiene manifest, iconos y aviso público sin conexión; no almacena datos comerciales ni escrituras pendientes. Dexie y la sincronización siguen siendo dirección acordada, no funcionalidad terminada.

## Cómo interpretar esta memoria

- **Confirmado:** el usuario lo solicitó o eligió expresamente.
- **Propuesto:** recomendación del asistente que aún requiere definición o aceptación.
- **Pendiente:** decisión abierta; no asumir que tiene una respuesta acordada.

Las instrucciones posteriores del usuario prevalecen. Mantener este documento al día sin presentar sugerencias como decisiones tomadas.

## Mantenimiento y consumo de contexto — confirmado

- Usar el contexto disponible; consultar la memoria solo cuando falte información necesaria, no ante cada pregunta. Editarla únicamente cuando el usuario indique expresamente que algo quedó decidido o definido, o pida actualizarla. Las preguntas, ideas y recomendaciones no autorizan por sí solas una edición.
- Mantener `AGENTS.md` breve y por debajo de 32 000 bytes en UTF-8; el límite es un techo, no un objetivo de tamaño.
- Conservar aquí el contexto útil del producto; en `AGENTS.md`, solo instrucciones operativas y referencias.
- Limpiar ambos documentos: consolidar duplicados, reemplazar acuerdos obsoletos y retirar pendientes resueltos o información que ya no aporte. Preservar las decisiones vigentes.
- Evitar transcripciones e historiales largos. Consultar solo las secciones necesarias; separar documentos por tema con un índice si el crecimiento lo justifica.
- Esta preferencia busca reducir contexto y consumo; no establece una equivalencia garantizada entre bytes y créditos.

## Contexto real del negocio

- El negocio familiar tiene dos puestos; uno no está activo actualmente.
- En el puesto trabajan una o dos vendedoras. Una vendedora puede atender a varias personas a la vez.
- Los clientes piden ver productos; solo al decidir la compra se embolsan las prendas, se cobra y se entregan.
- La operación habitual no registra nombre, DNI ni teléfono del comprador.
- Cobran por efectivo, Yape o Plin. En el negocio familiar existen tres QRs de los dueños, pero el usuario descartó identificar al receptor en VEXOR: basta registrar el medio de pago.
- Los registros de compras y mercadería se llevan actualmente en papel. Pueden comprar a proveedores o en mercados mayoristas sin recibir comprobantes.
- No hay espacio para una computadora. Debe funcionar en celulares, incluidos equipos de gama baja.
- La imagen aportada muestra mercadería distribuida en vitrinas, estantes, exhibidores y bolsas. El usuario explica que la atención se realiza hacia el pasillo del mercado. Encontrar físicamente los productos es una necesidad importante.
- El efectivo se guarda donde resulte práctico: cajón, bolsa, canguro, etc. El usuario descartó apertura, cierre y arqueo de caja.
- En Navidad y Año Nuevo hay unos tres días de gran aglomeración. Participan entre cinco y siete vendedores temporales y aun así se pierden ventas por falta de capacidad de atención. El espacio de campaña es reducido, hacia el pasadizo o la calle; las prendas mostradas pueden quedar fuera de sus bolsas, mezclarse y perder su ubicación. También ocurren hurtos de exhibición pese a la vigilancia.
- En esas campañas el efectivo de los vendedores se reúne en dos bolsos, de la madre y la hermana del usuario, y se cuenta después en casa. El total vendido del día incluye efectivo, Yape y Plin; no representa solo el efectivo reunido ni la ganancia.

## Decisiones confirmadas

### Primera entrega y validación

- Antes de empezar las pruebas y el uso real en el puesto, debe estar completo el alcance funcional acordado para la primera versión. Se permiten desarrollo y pruebas iterativas previas; el orden de construcción es flexible. Esto no convierte propuestas ni funciones futuras en alcance aprobado.
- Se acepta realizar un recorrido de pantallas o demo para revisar y mejorar los flujos antes del uso real.
- **Modelo inicial disponible:** se presentaron 60 tablas propuestas, con finalidad, usos, relaciones y diagramas entidad-relación multitenant; dos son condicionales a la identificación individual de etiquetas. Es una base de revisión, no aprobación de todos sus campos o funciones. El diseño físico del primer bloque debe concretar columnas, tipos, claves, restricciones, índices necesarios y políticas de aislamiento antes de sus migraciones.

### Inicio del desarrollo y responsabilidades — confirmado

- **El usuario define las reglas de negocio y las funcionalidades. El asistente se encarga del trabajo técnico:** diseño e implementación de base de datos, backend, frontend, pruebas y despliegue, respetando el alcance acordado. No trasladar al usuario decisiones rutinarias de programación.
- Comenzar el desarrollo por módulos; no esperar a definir todo el sistema ni abrir otra ronda general de planificación. Resolver con el usuario las reglas pendientes antes de implementar la función que las necesita. Presentar casos concretos y opciones cuando haga falta una decisión de negocio.
- **Primera secuencia:** base de datos del núcleo de negocios, usuarios, roles/permisos y locales —diseño físico, herramienta de persistencia, migraciones y comprobación de aislamiento—; después backend de autenticación, pertenencia y permisos; luego acceso y primeras pantallas del frontend/demo.
- Empezar por la base de datos significa el primer bloque, no crear las 60 tablas de una sola vez. La persistencia implementada utiliza Kysely y `pg`, con migraciones SQL versionadas; los detalles técnicos corresponden al asistente dentro del stack acordado.

### Orden de implementación y cierre del segundo bloque — confirmado

- **Orden acordado después del núcleo publicado:** configuración del negocio → productos e inventario inicial → ventas → venta sin internet y sincronización. Diseñar ventas desde el inicio para su posterior operación offline; esta secuencia no elimina ese requisito ni cierra las reglas pendientes de cada módulo. Completar el alcance acordado antes del uso real en el puesto.
- **Bloque 2 terminado y publicado:** Mi negocio (nombre y rubro libre con sugerencias, sin zona horaria visible en el formulario); Puestos y almacenes (creación y edición por el propietario, ubicación por local, habilitación de venta y pausa/reactivación); Equipo (incorporación por invitación, accesos, propiedad, roles libres, asignación de locales y permisos individuales con vigencia/revocación). La ubicación guarda mercado, pabellón/sector, número y referencia; Mi negocio la consulta sin duplicarla. La zona horaria sigue interna. Un local puede almacenar y también vender si está habilitado.
- **Secuencia de trabajo dentro del bloque:** primero revisar y completar la base de datos, después backend y finalmente frontend, con las verificaciones correspondientes. Reutilizar el núcleo existente; una etapa puede quedar cubierta sin nuevas tablas o migraciones si el esquema actual satisface el alcance.
- La administración de equipo, roles y asignaciones está reservada al propietario. Existen cuatro permisos operativos; las bases sugeridas Solo consulta, Gestión de locales y Consulta de locales y equipo preparan casillas editables y requieren guardar. El nombre del rol no concede accesos automáticamente. Los permisos de nuevos módulos se incorporarán con sus operaciones y autorización efectiva; no se aprueba una matriz comercial completa por anticipado.
- La base impide más de un local activo habilitado para venta por negocio. Este límite es fijo; aún no depende de suscripciones ni limita la cantidad de almacenes. El comerciante crea/configura sus locales; la gestión comercial de planes/cupos sigue pendiente.
- Rama del bloque: `codex/configuracion-negocio`, integrada en `main` en `068c1f1`. Detalle en [Configuración del negocio](diseno/CONFIGURACION_NEGOCIO.md). **Siguiente bloque según el orden acordado: productos e inventario inicial**, comenzando por revisar los datos mínimos y reglas pendientes, después base de datos, backend y frontend. Este cierre no inicia su implementación ni crea una rama nueva por sí solo.

### Arquitectura — confirmado

- El sistema tendrá arquitectura monolítica, según indicación expresa del usuario. La organización modular y el esquema concreto de datos se revisan como propuestas técnicas; no quedan aprobados por elegir monolito.

### Organización del repositorio — confirmado

- El usuario aprobó separar `frontend/` y `backend/`, con funcionalidades de `proveedor/`, `comerciante/` y mecanismos reutilizables en `compartido/` dentro de cada `src/`. Proveedor corresponde a la administración de VEXOR; comerciante, a la operación del negocio. Se conserva el monolito, una sola identidad y el aislamiento vigente.
- Migraciones, configuración y certificado público de Supabase en `backend/supabase/`; conexión, transacciones y tipos SQL en `backend/src/compartido/database/`. Pruebas y herramientas dentro de su frontend/backend, con comandos npm desde la raíz y un solo archivo de dependencias.
- La reorganización está publicada y conserva las URLs y reglas existentes; las pantallas comerciales de configuración se implementaron en el mismo bloque. Ver [estructura, responsabilidades y verificación](diseno/ESTRUCTURA_PROYECTO.md). Los archivos generados quedan ocultos en el explorador compatible con VS Code.

### Stack tecnológico y alojamiento para pruebas

- **Base de datos:** PostgreSQL, alojado inicialmente en Supabase para desarrollo y pruebas.
- **Backend:** NestJS sobre Node.js, con TypeScript, alojado inicialmente en Render.
- **Frontend:** React con TypeScript y Vite, como PWA, alojado inicialmente en Vercel.
- **Datos en el celular — dirección pendiente de implementar:** IndexedDB mediante Dexie.js para los datos necesarios para vender y las ventas pendientes de sincronización.
- **Carga offline — dirección del producto:** service worker y caché de recursos. Actualmente solo se guarda un aviso público sin conexión; la sincronización comercial requiere implementación propia y sigue pendiente.
- **Autenticación:** Supabase Auth. Persistencia del núcleo con Kysely/`pg`; alojamiento de la demo y endpoints definidos en «Alojamiento y publicación vigentes».
- La elección inicial de alojamiento es para desarrollo y pruebas personales, usando mayormente planes gratuitos. No se han elegido planes de pago ni cerrado el alojamiento para producción.

### Autenticación y aislamiento entre negocios

- **Aislamiento obligatorio:** un negocio no puede consultar ni modificar datos de otro tenant. Esta protección debe abarcar el backend, la base de datos y los datos locales y operaciones pendientes de sincronización del celular.
- **Supabase Auth identifica al usuario.** NestJS valida su token y comprueba su pertenencia al negocio y los roles y permisos necesarios para cada operación.
- **El `tenant_id` enviado desde el celular no concede acceso por sí solo.** NestJS debe validar ese contexto frente a la pertenencia y los permisos del usuario; cambiar el identificador nunca debe permitir acceder a otro negocio ni operar sobre sus datos.
- **PostgreSQL refuerza el aislamiento con políticas RLS (Row Level Security)** para limitar las filas accesibles según el negocio autorizado. Configurar el contexto de tenant y los permisos de la conexión usada por NestJS para que las políticas se apliquen; ciertos roles privilegiados pueden omitirlas. Usar Supabase no garantiza este aislamiento automáticamente.
- El núcleo ya implementa políticas RLS, contexto por transacción y conexión SQL restringida, con verificación de pertenencia y permisos en NestJS. La interfaz trata sesión vencida y acceso denegado. Quedan pendientes la separación local de datos, continuidad del acceso sin conexión y revalidación de permisos al sincronizar; no confundir los controles HTTP existentes con una solución offline terminada.

### Servicio, negocio y puestos

- Un tenant representa un negocio.
- El administrador de VEXOR vende el servicio, registra al negocio y lo vincula con su propietario.
- El propietario accede con sus credenciales al área de comerciante y configura su negocio dentro de las funciones y límites contratados.
- VEXOR es un sistema de gestión para el negocio y la administración de la plataforma. Los compradores no tendrán cuentas, interfaz ni acceso al sistema; su historial lo consulta únicamente el personal autorizado del negocio.
- La primera versión tendrá un único plan básico. Otros planes y capacidades se contemplan para versiones posteriores.
- **El plan básico incluye un puesto activo para venta y al menos un almacén pequeño por negocio.** No se han definido límites físicos ni de capacidad para ese almacén.
- El modelo general debe permitir varios puestos por negocio, aun cuando el plan inicial limite los activos.
- Un negocio puede tener puestos del mismo rubro o de rubros diferentes. Un solo puesto puede vender varios rubros.
- Un espacio puede operar como almacén sin estar habilitado para vender: por ejemplo, un puesto usado solo para guardar mercadería o un cuarto en casa. Sus productos y existencias deben registrarse.
- La configuración debe adaptarse al negocio y sus productos, sin quedar restringida al piloto de lencería.

### Uso móvil, venta y pagos

- Se elige una PWA con funcionamiento offline como dirección del producto.
- La interfaz debe ser intuitiva y rápida. El uso del sistema debe encajar con la atención real del puesto.
- **Campañas de alta afluencia:** el sistema debe ayudar durante estos picos sin convertir el registro en una demora que haga perder ventas. Su uso y configuración se adaptan al negocio, rubro y forma real de trabajo; una fecha o rubro no obliga a cambiar la venta habitual.
- La vendedora no tiene que registrar cada producto que muestra al cliente. Registra lo que se decide comprar.
- Habrá venta directa y carritos en espera para atender simultáneamente a varios clientes.
- Agregar un producto a un carrito no descuenta existencias. El descuento ocurre al completar la venta y registrar su pago; falta precisar el tratamiento de cobros parciales.
- La venta habitual no debe exigir identificar al comprador.
- Debe permitir seleccionar productos y escanear códigos. Comprar un lector externo no será obligatorio.
- Los productos sin código deben poder registrarse y encontrarse con nombres que reconozcan los comerciantes.
- Se registran efectivo, Yape o Plin, permitiendo pagos mixtos en una misma venta y mostrando cuánto falta cubrir. Ejemplo: S/50 pagados con S/40 en Yape y S/10 en efectivo. No se requiere identificar al dueño o cuenta receptora.
- En efectivo, incluso dentro de un pago mixto, debe mostrar el total y calcular el vuelto a partir del importe entregado y la parte pendiente de cubrir.
- Se descartan apertura, cierre y arqueo de caja. Esto no elimina el registro de pagos, gastos ni reportes.

### Disponibilidad, carritos y venta offline

- Vender sin internet es un requisito confirmado. El alcance offline de las demás operaciones sigue pendiente.
- Con conexión, advertir sobre stock limitado, agotado o insuficiente y cuando las cantidades de los carritos compartidos superen lo disponible. Los carritos no descuentan ni reservan existencias; al completar una venta se vuelve a comprobar la disponibilidad.
- Sin conexión, mostrar que el stock puede haber cambiado y advertir según la información local. No afirmar que se detectó otro carrito o una venta de otro celular si no existe comunicación para conocerlos.
- Al recuperar conexión, sincronizar las ventas sin duplicarlas y señalar diferencias de inventario para revisión. Si dos ventas ya se cobraron, conservar ambas y mostrar la diferencia; no borrar una para cuadrar existencias. El procedimiento concreto de conciliación sigue pendiente.

### Postventa, cambios y devoluciones

- Las políticas de cambios y devoluciones deben configurarse según el negocio; no imponer la política del piloto a otros rubros. Distinguir devoluciones voluntarias de casos por fallas del producto.
- En el negocio familiar no se devuelve dinero por cambios voluntarios; sí se aceptan ciertos cambios, como otra talla. En ese cambio se reincorpora la existencia recibida y se descuenta la entregada. No generalizar esta reincorporación a productos defectuosos sin definir su tratamiento.
- Las correcciones de cobros, cambios y devoluciones requieren el permiso correspondiente del trabajador o autorización del propietario. Falta detallar sus flujos y diferencias de importe.
- Las anulaciones de ventas quedan pendientes de definición; no se ha decidido eliminarlas ni aplicar una devolución automática al inventario.

### Campañas configurables y etiquetas — confirmado

- El modo campaña es opcional y configurable. El flujo de etiquetas del puesto del usuario es una modalidad, no una obligación para todos los negocios o rubros. Una florería puede seguir vendiendo normalmente el 24 de diciembre; tampoco se presupone que todas las florerías trabajen igual.
- Se acepta el flujo de preparar e imprimir etiquetas desprendibles desde VEXOR, recogerlas al completar las compras y registrar después los productos vendidos, sin exigir el uso del sistema durante la aglomeración. El punto de venta sigue disponible como opción rápida.
- El total diario incluye efectivo, Yape y Plin, además de las ventas ya registradas en el punto de venta. El procesamiento posterior de etiquetas no vuelve a sumar ingresos ni a descontar productos ya registrados.
- El usuario aceptó las cinco mejoras: identificación legible, separación de etiquetas por estado, registro por tandas reanudable, identificación individual opcional para detectar repeticiones al escanear y reposición de etiquetas sin aumentar existencias.
- Flujo, reglas y decisiones pendientes en [Campañas y etiquetas](memoria/CAMPANAS.md). Allí se conservan los detalles para no imponerlos a toda venta ni duplicarlos aquí.

### Productos, inventario y compras

- Debe permitir incorporar mercadería que ya está en estantes, vitrinas o guardada, además de registrar nuevas compras.
- **Ficha mínima confirmada:** solo el nombre es obligatorio; código, características, costo y precio son opcionales. Un costo o precio sin registrar permanece pendiente, no se convierte en cero.
- **Códigos confirmados:** impedir que un código identifique más de un producto, variante o presentación del mismo negocio.
- Debe registrar y permitir consultar ubicaciones para encontrar productos.
- El comerciante elige el detalle que necesita registrar. Los ejemplos de tres niveles no deben convertirse en campos rígidos u obligatorios por rubro.
- Marca, modelo, talla, copa, color y diseño son ejemplos de características; no una lista universal obligatoria.
- “Surtido” fue un ejemplo del usuario, no el nombre obligatorio de una modalidad ni una clasificación que se deba imponer.
- Se incluyen desde la primera versión compras y ventas por unidad, paquete, docena u otras presentaciones configuradas según el producto.
- El usuario aceptó como recorrido recomendado elegir puesto, preparar ubicaciones, registrar productos, asociar códigos, definir presentaciones y contar existencias iniciales. Debe adaptarse a la incorporación gradual y al rubro.
- **Inventario inicial por etapas:** cada producto empieza a descontar existencias cuando se confirma su conteo, sin esperar a terminar todo el puesto.
- **Un artículo sin registrar o con ficha creada pero conteo inicial sin confirmar se vende fuera de VEXOR, sin registrar esa venta en el sistema.** No se exige contar primero para realizar la venta física. El usuario lo trata igual que un producto aún no creado; no introducir una venta libre ni inventar existencias para registrarlo.
- **Existencia confirmada en cero con una unidad física disponible:** venderla en VEXOR o corregir esa diferencia requiere autorización del propietario o de un rol con los permisos correspondientes. El flujo concreto de corrección queda por detallar.
- **Dos modos de ubicación configurables:** por defecto, total por puesto con ubicaciones de referencia; el negocio puede activar cantidades exactas por ubicación.

### Almacenes y traslados

- Registrar los traslados de productos entre puestos y almacenes, con origen y destino.
- El traslado tiene dos momentos: registrar la salida en el origen y confirmar la entrada en el destino cuando llega la mercadería. La salida no equivale a recepción automática.
- Ejemplo del usuario: enviar un producto del puesto B al puesto A y registrar su entrada en A solo al llegar.

### Clientes frecuentes y descuentos

- La venta sigue sin exigir identificar al comprador. Se quiere una ficha opcional para clientes recurrentes, con nombre y teléfono, sin exigir DNI; este puede añadirse si el cliente lo brinda voluntariamente. Los campos mínimos exactos quedan por definir.
- Vincular compras a ese cliente permitirá al personal autorizado consultar su historial y conocer qué productos suele llevar. El comprador no tiene acceso al sistema.
- Los descuentos deben poder aplicarse a cualquier comprador, nuevo o frecuente, sin obligarlo a registrarse.
- El propietario configura las políticas y límites de descuento.
- Una excepción de descuento se aplica únicamente a la venta concreta; no concede al vendedor permiso para cambiar el límite general de descuentos.
- En la venta se debe poder negociar indicando el total final o el descuento en soles: tres productos de S/18 suman S/54; cobrar S/50 equivale a descontar S/4. La interfaz concreta queda por diseñar y debe ser amigable.
- Las recomendaciones de productos a partir del historial, especialmente mediante IA, quedan como idea para explorar después. No se ha aprobado su implementación ni elegido proveedor o modelo para esta función; esto no revoca la ayuda básica con IA ya solicitada.

### Equipo, control e IA

- El propietario administra trabajadores y les concede acceso mediante roles y permisos. Ejemplos solicitados: vendedor, encargado y administrador del negocio.
- Dos trabajadores con el mismo rol pueden tener permisos individuales distintos, configurados por el propietario; por ejemplo, permitir a uno gestionar inventario y al otro solo vender.
- El propietario puede conceder permisos temporales con vencimiento editable, como habilitar un ajuste por mercadería encontrada. No se exige un flujo de solicitudes y aprobaciones dentro del sistema. La matriz exacta y el comportamiento offline siguen pendientes; el consumo único propuesto para excepciones de venta aún no está confirmado.
- Consultar costos, cambiar precios y otras acciones dependen de los roles, permisos y políticas del negocio. El usuario señala al propietario para consultar costos y al propietario o encargado para cambiar precios; la matriz detallada y las excepciones siguen pendientes.
- Debe haber reportes y una bitácora de auditoría.
- El usuario quiere ayuda básica con IA en el plan inicial: asistencia para registrar productos, orientación sobre el sistema y preguntas sencillas en lenguaje natural sobre el negocio.
- Se contemplan capacidades de IA adicionales en planes futuros. No se ha elegido proveedor ni modelo.

## Propuestas de diseño aún no cerradas

### Catálogo e inventario

- Mantener un único registro de productos con dos vistas: catálogo para lo que se vende y sus precios; inventario para existencias, ubicaciones y movimientos.
- Los códigos, nombres y variantes pertenecen al producto; disponibilidad y ubicación pueden mostrarse en ambas vistas sin duplicar registros.
- Navegación sugerida para gestión: “Productos” e “Inventario”. Para vendedoras: “Vender” y “Buscar productos”, según permisos.
- Registro progresivo: datos mínimos, características opcionales y variantes cuando se necesite separar cantidades. Los rubros ofrecen plantillas editables.
- Una característica descriptiva ayuda a buscar; una variante separa existencias por combinación. Un grupo sin desglose no permite informar cantidades por color o talla.
- Para pasar de existencias agrupadas a variantes se necesita un conteo o distribución explícita; no se puede inventar el desglose histórico.

### Identificación y presentaciones

- Reutilizar códigos del fabricante, permitir códigos internos y ofrecer etiquetas imprimibles opcionales.
- Un código puede identificar producto, variante o presentación. Varias unidades iguales pueden compartir código; no se exige serializar cada prenda. La identificación individual opcional de etiquetas de campaña es un control de etiquetas, no una obligación de serializar todo el inventario.
- Si el código solo identifica el modelo, pedir la variante. Si identifica una variante concreta, agregarla directamente.
- Escanear un código desconocido no proporciona automáticamente nombre, precio o una ficha universal.
- Ofrecer búsqueda por nombre o alias, fotos y favoritos, además de cámara o lector compatible. La compatibilidad y el rendimiento requieren validación en dispositivos reales.
- Definir equivalencias por producto, por ejemplo una docena = 12 unidades. El tamaño de un paquete no es universal.
- Permitir precios por presentación independientes de multiplicar el precio unitario.

### Incorporación y movimientos

- Separar inventario inicial, compras/recepciones, ajustes y traslados. El inventario inicial no es una compra nueva.
- Permitir registrar compras internas con comprobante opcional y una referencia sencilla al proveedor.
- Si se desconoce un costo, mantenerlo pendiente; no tratarlo como cero al calcular ganancias.
- Diferenciar producto pendiente de contar, conteo en preparación y existencia confirmada.
- Antes de confirmar un conteo, revisar las salidas ocurridas durante la preparación. Después de confirmar, registrar ventas y movimientos en lugar de editar silenciosamente la cifra inicial.
- Mostrar que los reportes de incorporación inicial abarcan las ventas registradas, no necesariamente toda la venta real.
- Permitir pausar y retomar la guía de configuración, sin imponer un orden rígido para tareas independientes.
- Separar administración de la plataforma y administración del negocio. Se sugirió invitar al propietario a establecer su propia contraseña.

### Almacenes, traslados y ampliación del plan

- Distinguir puesto de venta y almacén de las ubicaciones internas como estantes o vitrinas. Propuesta: existencias por puesto o almacén, con el detalle interno configurable ya previsto.
- Al confirmar la salida, descontar la cantidad disponible en origen y mostrarla en tránsito; al confirmar la recepción, sumarla al destino y retirarla del tránsito. Conservar el total de mercadería del negocio sin duplicarlo y sin tratar el traslado como venta o compra.
- Vincular salida y recepción a un mismo traslado, registrando productos, cantidades, responsables y fechas. Definir recepciones parciales, faltantes, cancelaciones y correcciones, además de sincronización offline.
- El usuario planteó como posibilidad futura un plan intermedio con hasta dos puestos de venta y dos almacenes, o un costo adicional para ampliar capacidad. No están aprobados los límites definitivos, el precio ni la modalidad comercial; no cambia el arranque con un único plan básico.

### Permisos, auditoría e IA

- Roles iniciales editables: propietario, administrador del negocio, encargado y vendedor; permisos por acción y puesto asignado.
- Diferenciar ver un módulo de acciones como consultar costos, cambiar precios, aplicar descuentos, anular ventas o ajustar existencias.
- Identidad individual para cada trabajador y auditoría de operaciones y correcciones, conservando los registros anteriores.
- IA para orientar, preparar fichas para revisión y consultar cifras calculadas por el sistema, respetando permisos.
- Separar reportes (“cuánto vendí”) y auditoría (“quién cambió el precio”).
- Propuesta: IA con conexión y ayuda básica local disponible offline. La IA no debe ser indispensable para vender o registrar mercadería.

### Clientes frecuentes y negociación

- En la venta, ofrecer “Agregar cliente” como acción opcional, con búsqueda de fichas existentes antes de crear otra. Considerar nombre o apodo y teléfono opcional; no asumir que el nombre identifica de forma única ni que un teléfono no pueda compartirse.
- Consultar el historial desde la ficha del cliente dentro del negocio, según permisos del personal.
- Mostrar una acción “Aplicar descuento” con dos entradas alternativas: “Dejar total en” y “Descontar S/”. Calcular ambas sobre el mismo descuento y mostrar subtotal, descuento y total final, sin acumular dos rebajas por usar las dos entradas.
- Empezar por descuento sobre el total de la venta; el descuento por producto, porcentajes y promociones automáticas aún no están definidos.
- Conservar precios originales, descuento, total cobrado y trabajador responsable en el registro de venta. Proponer permisos de descuento por rol, límites por venta y autorización del propietario para excepciones; el comportamiento offline requiere definición.
- Mostrar productos comprados anteriormente o con mayor frecuencia sin necesitar IA. No conceder descuentos automáticos por ser cliente frecuente ni interpretar el historial como autorización para enviar mensajes.

## Mapa de módulos propuesto

Este mapa organiza la conversación; todavía no constituye un alcance completo aprobado para la primera versión.

- **Administración de VEXOR:** negocios, propietarios, suscripciones, planes y límites.
- **Inicio y configuración del negocio:** incorporación guiada, puestos, almacenes, rubros y preferencias.
- **Productos:** catálogo, atributos, variantes, códigos, presentaciones y precios.
- **Inventario:** conteo inicial, existencias por puesto y almacén, ubicaciones, ajustes y traslados con salida y recepción.
- **Compras:** proveedores, costos y recepción.
- **Ventas:** búsqueda/escaneo, carritos, cobro y vuelto.
- **Gastos:** salidas de dinero del negocio.
- **Equipo y permisos:** trabajadores, roles y acceso por puesto.
- **Reportes:** resultados según los datos disponibles.
- **Auditoría:** operaciones, responsables y cambios.
- **Asistente:** ayuda transversal con IA y orientación básica.

## Riesgos y reglas por precisar

- Si se confirman 100 unidades y luego se registra una venta de una, quedan 99; no descontar también editando el conteo.
- Si la venta ocurre antes de confirmar y fuera del sistema, confirmar la cantidad física restante; no descontarla después otra vez.
- Una existencia desconocida no equivale a cero. Los artículos pendientes de conteo se venden fuera de VEXOR; el conteo confirmado debe reflejar lo que queda físicamente, sin volver a descontar esas ventas.
- Dos celulares sin comunicación entre sí no conocen inmediatamente las ventas del otro. El comportamiento esperado está confirmado en la sección de venta offline; falta diseñar los mecanismos de sincronización, prevención de duplicados y conciliación.
- La confirmación del inventario inicial debe coordinar conteo, ventas y movimientos pendientes de los dispositivos; no está diseñado aún ese procedimiento.
- En ubicación orientativa no se conoce cuántas unidades hay en cada espacio. En modo exacto deben registrarse movimientos internos.
- Los reportes y ganancias no deben presentar datos incompletos o costos desconocidos como cifras completas.

## Pendientes para próximas conversaciones

1. Iniciar el siguiente bloque de productos e inventario inicial: concretar los datos mínimos y reglas abiertas necesarias; después base de datos → backend → frontend. Reutilizar un único registro de productos y plantillas editables por rubro, sin duplicar catálogo e inventario. Luego siguen ventas y venta offline/sincronización. La configuración del negocio ya está terminada y publicada; planes/cupos y alojamiento continúan pendientes, sin autorización automática para ampliarlos.
2. Detallar cómo se corrige un conteo confirmado y se resuelve una diferencia entre stock registrado y físico, con autorización del propietario o de un rol habilitado. La venta de productos con conteo pendiente ya está resuelta: se realiza fuera de VEXOR.
3. Definir características estructuradas, variantes, equivalencias y detalles de búsqueda. La ficha mínima y el rechazo de códigos duplicados ya están confirmados en «Productos, inventario y compras».
4. Precisar si el modo de ubicación exacta se configura por negocio, puesto o producto, y cómo se cambia de modo.
5. Definir precios por puesto/presentación, alcance de descuentos por venta o producto, límites y excepciones, cobros parciales y flujos de postventa y anulaciones. Están confirmados los pagos mixtos con vuelto, el descuento en soles o mediante total final y las políticas configurables por el propietario; faltan diferencias de precio en cambios, reembolsos y tratamiento de productos defectuosos.
6. Extender permisos y auditoría al implementar cada módulo posterior. La integración online Supabase Auth/NestJS/RLS y el manejo de sesión vencida ya existen; definir continuidad local, caducidad offline y revalidación al sincronizar.
7. Definir activación/desactivación y cambio de uso de puestos y almacenes, conservación de historial y ampliación del plan. El básico incluye un puesto activo para venta y al menos un almacén pequeño; el plan intermedio sigue como posibilidad sin límites ni precio cerrados.
8. Delimitar funciones y límites comerciales del plan básico: trabajadores, dispositivos, productos e IA, además de suscripción y cobro del servicio.
9. Delimitar las preguntas y acciones del asistente, revisión de propuestas, consumo y comportamiento sin conexión.
10. Detallar preparación inicial del celular, mecanismos de sincronización, conciliación y recuperación de datos, además del alcance offline de otras operaciones. Ya están aceptados la venta offline, las advertencias según la información disponible, la sincronización sin duplicados y la conservación de ventas cobradas ante diferencias.
11. Precisar qué necesidades de otros rubros entran en la primera versión, como cantidades fraccionarias, venta por peso, lotes o vencimientos.
12. Revisar por módulo la propuesta lógica de 60 tablas, sin tratarla como esquema definitivo. Respetar las migraciones y el aislamiento del núcleo ya implementados; diseñar y verificar los cambios adicionales. La demo pública sigue usando vexor-dev; el lanzamiento comercial requiere sus propias comprobaciones de capacidad y operación.
13. Precisar campos mínimos y búsqueda de clientes frecuentes, corrección de fichas duplicadas y permisos del personal para consultar el historial. Los compradores no tendrán acceso al sistema. Las sugerencias personalizadas con IA quedan para después.
14. Detallar traslados: cantidades disponibles y en tránsito, recepción parcial, diferencias, cancelación, corrección y sincronización. Salida y recepción separadas ya están confirmadas.
15. Precisar la configuración de campañas, impresión, venta rápida y conciliación según los pendientes de [Campañas y etiquetas](memoria/CAMPANAS.md). El flujo base y las cinco mejoras ya están aceptados; estos detalles no deben tratarse como resueltos.

## Persistencia

Esta memoria es un archivo local del repositorio. `AGENTS.md` indica consultarla al retomar trabajo en VEXOR. No equivale a activar o modificar la memoria global de Codex.
