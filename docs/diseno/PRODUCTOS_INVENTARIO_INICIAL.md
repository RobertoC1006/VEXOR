# Productos e inventario inicial — entrega para pruebas

Rama: `codex/productos-inventario-inicial`, creada desde `main` en `62828eb`.
El usuario autorizó el 21 de octubre de 2026 publicar esta entrega para probarla desde un iPhone. No cierra todas las funciones futuras de productos e inventario.

## Niveles y escaneo incorporados

- Nivel por ficha: simple (datos básicos y total), intermedio (características descriptivas) y avanzado (variantes con conteos independientes). El nivel no se activa por rubro; cualquier producto puede usarlo.
- Características editables con nombre y valor, sin campos universales obligatorios. La plantilla de lencería ofrece marca/modelo en la ficha y talla/copa/color/diseño en las variantes; los campos sin valor se omiten y se pueden añadir o quitar otros.
- Las variantes reutilizan productos, códigos únicos por negocio y conteo por local. La ficha avanzada agrupa las variantes y no recibe un total adicional. La búsqueda del código de una variante encuentra su modelo; el inventario muestra la combinación concreta.
- Se rechazan combinaciones repetidas, cambios a avanzado de una ficha ya contada y cambios de combinación de una variante contada. La distribución explícita de existencias y correcciones aún requieren su siguiente flujo; no se inventa un desglose histórico.
- “Preparar ejemplo de lencería” completa un formulario avanzado con datos ficticios, sin guardarlos automáticamente ni crear existencias. Las variantes se añaden explícitamente.
- Botón “Escanear con cámara” junto al código en fichas y variantes. ZXing se carga al abrir el lector, solicita vídeo sin audio, prioriza la cámara trasera y conserva el código como texto. No depende de `BarcodeDetector` nativo ni consulta un catálogo externo.
- El vídeo se procesa en el dispositivo. Cerrar, salir de la pantalla o pasar la página a segundo plano detiene cámara y decodificador, incluso si el permiso termina de resolverse después. Hay entrada manual y mensajes de permiso denegado, cámara ausente/ocupada y falta de HTTPS.
- La compatibilidad se implementó con Safari/iOS en mente; la prueba de foco, luz y lectura de envases reales se realiza en el teléfono del usuario. Las pruebas automatizadas no se presentan como validación en un iPhone físico.

Migración adicional: `20261021000300_niveles_variantes.sql`. La aplicación manual a desarrollo se realiza con `backend/scripts/migrate-products.ts` (consulta por defecto; `--apply` solo con el destino de desarrollo explícito). Nunca corre al iniciar o desplegar el servidor. Los destinos siguen siendo Vercel y Render existentes.

El 21 de octubre de 2026 se aplicaron y registraron manualmente ambas migraciones nuevas en `vexor-dev`, dentro de una transacción, verificando RLS habilitada y forzada en las dos tablas. No se ejecutaron reseteos ni se modificaron existencias comerciales existentes.

## Decisiones confirmadas en este bloque

- Solo el nombre es obligatorio. Código, características, precio y costo son opcionales. Un importe desconocido se conserva como `null`, nunca se supone cero.
- Un código no puede identificar distintos productos, variantes o presentaciones del mismo negocio. Esta entrega aplica la unicidad al código de la ficha simple; al extender la identificación deberá conservarse una única frontera de unicidad para todos los destinos.

## Implementado en esta entrega

- Un único catálogo por negocio, con alta y edición de fichas simples: nombre, alias, código opcional, descripción libre, precio y costo por unidad opcionales. Los códigos se guardan como texto, conservando ceros iniciales; la comparación actual es exacta, sin convertir mayúsculas ni minúsculas.
- Búsqueda por nombre, alias o código, con páginas de 25 registros. La API limita las páginas a 100 y valida entradas.
- Vista de inventario por puesto o almacén activo, sobre los mismos productos. Sin registro de conteo, la cantidad es desconocida (`null`), no cero.
- Borrador de conteo en unidades enteras y referencia orientativa opcional, como una vitrina. La cantidad corresponde al total del local, sin atribuir cantidades a cada estante.
- Confirmación después de guardar y revisar el borrador. La interfaz pide revisar el remanente físico, incluidas las ventas realizadas fuera de VEXOR mientras se preparaba el conteo. La confirmación no modifica simultáneamente la cantidad revisada.
- Cada producto/local se confirma independientemente. Un cero confirmado se distingue de un conteo pendiente. No se registra una compra ni se generan ingresos.
- Control de versión para rechazar ediciones obsoletas. La confirmación repetida de una misma versión devuelve el resultado previo sin nuevas escrituras.
- El conteo confirmado queda protegido en servidor y por un trigger SQL: no se permite sobrescribirlo, borrarlo ni volverlo a borrador. Las correcciones requieren un flujo posterior de movimientos.
- Permisos `productos.ver`, `productos.gestionar`, `inventario.ver`, `inventario.contar` e `inventario.confirmar`. Los tres últimos se evalúan por local, con acceso asignado y denegaciones vigentes. Inventario también requiere consultar el catálogo. Los permisos se configuran con el editor existente; no se conceden automáticamente a trabajadores.
- Transacciones con contexto autorizado, RLS forzada, claves foráneas compuestas por negocio y auditoría de cambios y responsables.

## Persistencia y API

Migración: `backend/supabase/migrations/20261021000200_productos_inventario_inicial.sql`.
Se prueba primero en bases locales desechables. La publicación requiere aplicar manualmente las dos migraciones nuevas, integrar `main` y verificar ambos servicios. `/version.json` en Vercel y `/api/v1/health` en Render permiten comprobar la revisión publicada sin exponer credenciales.

| Ruta bajo `/api/v1/negocios/:negocioId`      | Método      | Uso                                                    |
| -------------------------------------------- | ----------- | ------------------------------------------------------ |
| `/productos`                                 | GET / POST  | Buscar o crear fichas                                  |
| `/productos/:id`                             | GET / PATCH | Consultar o editar una ficha; PATCH exige versión      |
| `/locales/:localId/inventario`               | GET         | Productos, estado de conteo y permisos efectivos       |
| `/locales/:localId/inventario/:id/conteo`    | PUT         | Guardar borrador; versión 0 para el primero            |
| `/locales/:localId/inventario/:id/confirmar` | POST        | Confirmar versión revisada con `revision_fisica: true` |

La tabla `inventario_inicial` conserva la incorporación inicial. Al desarrollar ventas y movimientos, el disponible deberá calcularse o mantenerse considerando esos movimientos; el conteo inicial confirmado no se editará para descontar ventas.

## Alcance que falta dentro del bloque

Distribución explícita de existencias agrupadas; varias identificaciones por producto; presentaciones y equivalencias; etiquetas, fotos y favoritos; ubicaciones internas estructuradas y modo exacto. Las cantidades fraccionarias y reglas de precio por puesto/presentación siguen por precisar.

La corrección de conteos confirmados, las compras, los traslados, las ventas y la sincronización offline no están implementados aquí. La revisión física de esta entrega online no resuelve la coordinación futura de movimientos pendientes entre dispositivos offline.

## Verificación local

- `npm run typecheck` y `npm run build`: correctos.
- `npm run db:test`: migraciones desde cero y 94 comprobaciones existentes, además de limpieza de contexto.
- `npm run test:api`: 328 comprobaciones HTTP/integración, con PostgreSQL real desechable y Auth local controlado. Incluye códigos duplicados entre modelos y variantes, importes pendientes, separación entre negocios y locales, permisos y denegaciones, conteo cero, versión obsoleta, dos guardados concurrentes, confirmación repetida, características inválidas, variantes repetidas, protección de conteos y ausencia de doble total del modelo.
- `npm run test:web`: 49 pruebas correctas: ficha mínima, coma decimal, costo pendiente, niveles, ejemplo sin escritura automática, cero frente a cantidad desconocida, revisión explícita, error de red y consulta sin permiso; ciclo de vida de cámara y decodificación de un EAN-8 sintético.
- `npm run test:client-build`: paquete público sin secretos locales, manifest e iconos correctos.
- Demo local con datos ficticios: crear ficha → stock desconocido → guardar 12 unidades en borrador → revisar → confirmar. Evidencia local en `test-results/inventario-inicial-demo.png`, excluida de Git.
- Demo avanzada: modelo de sostén → variantes 34/B/negro y 36/B/negro → dos filas de inventario sin total duplicado del modelo. Evidencia local en `test-results/lenceria-variantes-demo.png`, excluida de Git.
