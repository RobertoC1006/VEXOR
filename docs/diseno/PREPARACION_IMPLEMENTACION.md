# VEXOR: preparación para implementar

Fecha: 20 de octubre de 2026. Evaluación de la propuesta, no aprobación de todas las tablas o funciones.

## Estado actual

La [propuesta lógica](MODELO_DATOS_INICIAL.md) organiza 60 tablas y sus relaciones. Reemplaza `autorizaciones` por `permisos_otorgados`, sin aumentar el conteo. Las dos tablas de etiquetas individuales siguen siendo condicionales. El concepto de artículo/variante con stock separado sigue distinto del código que lo identifica.

La estructura sirve para avanzar al diseño físico por módulos. Aún no se han definido columnas completas ni escrito o ejecutado migraciones. Revisar el listado y los diagramas no demuestra integridad, aislamiento, rendimiento ni que todas las reglas estén resueltas.

## Antes de las primeras migraciones

| Trabajo | Resultado necesario | Qué decisión requiere del usuario |
| --- | --- | --- |
| Convenciones y diccionario del núcleo | Nombres, identidades, tipos, campos obligatorios/opcionales, fechas y estados para negocio, usuarios, miembros, roles y locales. | Revisar únicamente las decisiones que cambien el funcionamiento; los detalles técnicos pueden proponerse y comprobarse. |
| Integridad por negocio | Claves y relaciones que impidan vincular filas de tenants distintos, incluso detalles y puentes. Definir acciones al borrar/desactivar y conservación de historial. | No reabrir el aislamiento: ya es obligatorio. La política comercial de baja y conservación aún debe concretarse. |
| Seguridad de ejecución | Roles SQL de migración y ejecución separados; contexto transaccional de tenant/actor; políticas RLS y permisos de API de datos compatibles con NestJS. | El principio ya está acordado; falta diseñarlo y verificarlo. |
| Herramienta de persistencia | Elegir ORM o constructor de consultas y una única forma de versionar migraciones. Debe soportar transacciones, SQL de RLS y contexto en la misma conexión. | Elección técnica pendiente; no exige volver a elegir el stack. |
| Entorno reproducible | Versión compatible con el PostgreSQL del proyecto de Supabase, configuración de desarrollo, secretos fuera del repositorio y datos ficticios. | Acceso o credenciales solo cuando haga falta ejecutar contra el servicio remoto. Se puede preparar el trabajo local antes. |
| Comprobación del núcleo | Crear desde cero la base de prueba, aplicar migraciones y verificar accesos de dos negocios y referencias cruzadas. | Ninguna nueva función de producto. |

Las restricciones `NOT NULL`, `UNIQUE`, claves primarias y foráneas expresan integridad real. La comprobación de datos de otras filas/tablas no debe disfrazarse de un `CHECK` local; definir la herramienta adecuada para cada regla. [Restricciones de PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html). RLS necesita políticas y un rol de ejecución al que realmente se apliquen. [Políticas por fila](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Antes de migrar o activar cada módulo

| Área | Decisiones o especificación pendiente |
| --- | --- |
| Permisos individuales | Catálogo de acciones, alcance por local, vencimiento/revocación, límites de excepción y vínculo de descuento con la venta en preparación. Se propone uso único para esa excepción; no está confirmado. |
| Catálogo y presentaciones | Campos mínimos, combinaciones de variantes, política de códigos duplicados, unidades y equivalencias, precios y alcance por local. Validar si la primera versión requiere peso, lotes, vencimientos o paquetes mixtos: pueden cambiar relaciones, no solo pantallas. |
| Inventario | Estados de incorporación, precisión de cantidades, corte de confirmación del conteo, ajustes y reversos; definición física del saldo total y del detalle por ubicación. Resolver ventas y movimientos pendientes antes de fijar el algoritmo de conciliación. |
| Ventas y pagos | Estados, fórmula de subtotal/descuento/total, redondeos, importes aplicados y vuelto; confirmación atómica e idempotencia. No asumir crédito ni cobros parciales todavía no acordados. |
| Compras y traslados | Estados, relación de líneas de origen y recepción, parciales, diferencias y cancelaciones. Separar costo, llegada física y pago. |
| Postventa | Identificación de la compra original, cambios de precio, dinero devuelto, mercadería defectuosa y anulaciones. No aplicar reincorporación automática a todos los casos. |
| Campañas | Alcance exacto de jornada y total declarado, correcciones, relación con POS y corte de conteos/tandas. Activar identificación individual solo si se elige esa modalidad. |
| Costos y reportes | Elegir valorización y costo de venta antes de prometer ganancias. Definir cómo se muestran datos incompletos e ingresos agregados de campañas. |
| Offline | Protocolo de cambios, deduplicación, retención, versiones y recuperación. Resolver acceso y permisos vencidos/revocados cuando hay hechos ya realizados sin conexión. La fecha del celular no prueba por sí sola que el permiso era válido. |

No hace falta resolver el proveedor de IA, comprar impresora, contratar alojamiento de producción o diseñar todas las pantallas para migrar el núcleo. Esas decisiones se completan antes de implementar/validar la función que las necesite.

## Orden de desarrollo propuesto

1. Convertir el núcleo negocio/identidad/permisos/locales en un diccionario físico, elegir persistencia y crear sus migraciones con pruebas de aislamiento.
2. Definir y migrar catálogo, variantes, presentaciones y códigos; resolver antes las necesidades de otros rubros que alteren ese esquema.
3. Definir y migrar conteos, saldos y movimientos, con sus invariantes y correcciones.
4. Definir venta/pagos y el contrato de sincronización como un recorrido integrado; verificar última unidad, reintentos y ventas offline cobradas. La sincronización no se agrega como parche después de diseñar ventas.
5. Completar compras, traslados, gastos, postventa, campañas y reportes con las reglas correspondientes.
6. Desarrollar el demo después de revisar el modelo inicial, como se acordó. Iterar implementación y pruebas internas; terminar el alcance acordado antes del uso real en el puesto.

La numeración organiza dependencias y no restringe pruebas o desarrollo iterativo interno. Un cambio posterior se introduce mediante una nueva migración; no se reescribe una migración que ya se aplicó en un entorno compartido.

## Comprobaciones realizadas en esta revisión

- Conteo de 60 tablas únicas y numeración completa.
- Correspondencia entre tablas listadas y entidades de los siete diagramas ER.
- Referencias actualizadas a `permisos_otorgados` y enlaces locales entre documentos.

Estas comprobaciones son documentales. Las pruebas SQL, de permisos efectivos, concurrencia y carga siguen por ejecutar cuando exista la implementación.
