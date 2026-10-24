# Ventas / Punto de venta

Bloque desarrollado desde `main` publicado `0a86de541be0d07c3bd4efeeb18a08d50edc35f8`.
Publicación autorizada por el usuario el 24/10/2026 en main, Vercel y Render.

## Alcance

- Puesto, búsqueda y escaneo de productos, combinaciones y presentaciones.
- Varios carritos en espera compartidos por puesto, persistentes en el servidor,
  con versiones para evitar sobrescribir cambios de otra vendedora. No reservan stock.
- Comprador general, sin registro obligatorio.
- Negociación directa mediante “Dejar total en S/”, tarjetas de totales cercanos,
  descuento visible y opción de quitarlo. Sin porcentajes ni aplicación automática.
- Campos de monto compartidos para pagos, negociación, límites, precios y costos:
  el cero inicial se reemplaza al escribir; se eliminan ceros sobrantes al pegar
  y se conservan separadores decimales e importes como `0.50`. No afecta códigos.
- Pago único: efectivo, Yape o Plin. Pago mixto: importes por esos tres medios.
  La suma debe cubrir todo el total; sin crédito, abonos ni transferencia.
- En mixto el campo efectivo es el dinero recibido. El vuelto se calcula automáticamente:
  total S/24, efectivo S/10 y Yape S/20 implica vuelto S/6 y efectivo neto S/4.
  No se exige un campo repetido ni una acción de cálculo. El exceso electrónico se bloquea.
  En pago único en efectivo se conserva el campo recibido.
- Resumen lateral en computadora, desplegable en celular y confirmación breve
  después del registro, con métodos, total, recibido/vuelto y nueva venta.
- Permisos por puesto `ventas.cobrar` y `ventas.descontar`, integrados en Equipo.
  Solo el propietario cambia el límite por venta; el vendedor respeta ese límite.
- Precio pendiente requiere corrección en catálogo. Conteo pendiente no se vende
  en VEXOR. Stock insuficiente bloquea; usar ajuste existente con autorización.

## Integridad

El cobro registra venta, líneas, pagos y movimientos del inventario en una transacción.
El saldo utiliza `app.existencias` y el registro de movimientos existente; no cambia
el conteo inicial. Bloqueos y comprobación final impiden ventas concurrentes sin stock.

Cada cobro tiene una operación UUID. Reintentar la misma solicitud devuelve la misma
venta; cambiar el contenido produce conflicto. Un carrito en espera solo se completa
una vez. Una respuesta de cobro incierta bloquea edición/cierre y conserva el intento
online en la sesión del navegador para recuperarlo con la misma operación.
Esto no implementa venta offline ni sincronización.

Las migraciones `20261023000300_ventas_pos` y `20261023000400_carritos_espera`
se aplicaron manualmente y registraron en vexor-dev el 24/10/2026 mediante el script
de migración existente, con transacción y RLS forzada verificadas. No se ejecutan
migraciones durante el arranque ni el despliegue del servidor.

## Verificación

- Typecheck y compilación de frontend/backend correctos.
- 105 pruebas de interfaz; 521 comprobaciones HTTP/integración.
- Migraciones desde cero: 71 comprobaciones del núcleo, 23 de invitaciones
  y limpieza del contexto al reutilizar conexiones.
- Pruebas POS con PostgreSQL temporal: pagos, vuelto, descuentos, presentaciones,
  permisos, aislamiento, rollback, precio pendiente, idempotencia, stock concurrente,
  carritos persistentes sin reserva y cobro único del carrito; conteo inicial intacto.
- Paquete público revisado sin secretos locales.
- Revisión visual en navegador de escritorio y tamaños de celular; cobro mixto
  ficticio completo, espera/retoma, descuentos, vuelto opcional y recuperación.

La prueba en un celular físico corresponde al usuario; la revisión de viewport
no la sustituye. La sesión y los datos ficticios de localhost no se trasladan a la
publicación: esta utiliza las cuentas y productos existentes de vexor-dev.

## Fuera de este bloque

Venta offline/sincronización, bitácora comercial general, compradores frecuentes,
anulaciones/devoluciones, precios por puesto, descuentos por producto, caja,
comprobantes y permisos de esos futuros módulos.

La base de roles y permisos ya existe; no confundirla con una bitácora comercial
completa. Hay auditoría de acceso/configuración, no auditoría global del negocio.
