# Existencias por local y traslados — prueba local

Implementación basada en el panel 4 de `referencias/vexor-mockup-general.png`.
Rama: `codex/existencias-traslados`. Publicación aprobada el 23 de octubre de 2026.
`20261023000200_movimientos_stock.sql` se aplicó manualmente antes del servidor,
registrada con verificación de RLS forzada. No se ejecuta al arrancar.

## Recorrido

- Inventario abre Existencias. Tocar un producto abre el detalle en modal, sin desplazar la lista.
- El detalle conserva foto del catálogo, datos del modelo y combinación elegida, locales autorizados,
  cantidades, mínimos e indicadores visuales. Permite cambiar de local sin salir.
- La matriz usa los ejes del modelo; sus filas y columnas son configurables. Otros ejes se filtran.
  Una celda con varias combinaciones permite elegir la concreta antes de operar.
- Listas, opciones, locales, movimientos y ejes extensos tienen paginación de 5 o 10.
- Los modales se cierran al tocar fuera. Se conserva el cierre con botón y Escape;
  el guardado bloquea los tres métodos. Un arrastre desde dentro no dispara el cierre exterior.
- Conteo inicial conserva el recorrido de borrador, revisión y confirmación. Pendiente nunca significa cero.
- Transferir descuenta del origen y mantiene las unidades en tránsito. Recibir suma solo lo recibido al
  destino. Una recepción parcial requiere nota; el resto permanece en tránsito y admite otra recepción.
- Ajustar pide cantidad física actual y motivo; revisa la diferencia antes de anexar el movimiento.
  No modifica el conteo inicial. No se incluyen cancelaciones ni bajas definitivas de faltantes en tránsito.
- Ambos locales deben estar activos y tener conteo confirmado del producto antes de un traslado,
  incluso si el saldo inicial del destino es cero.

## Integridad

Saldo único: vista `app.existencias`, conteo confirmado más movimientos. Catálogo, inventario y dashboard
la consultan. La vista usa `security_invoker`; conserva la RLS de las tablas subyacentes.

El historial solo permite insertar, con permisos separados `inventario.transferir`, `inventario.recibir`
y `inventario.ajustar`, además de consulta de productos e inventario y acceso al local. Los propietarios
conservan sus permisos; los roles existentes no reciben capacidades nuevas automáticamente.

Transacciones, bloqueo por producto, saldo esperado para salidas/ajustes, clave de operación idempotente,
restricciones de cantidades, RLS forzada y validación SQL adicional impiden duplicados, saldos negativos
y recepciones mayores que el envío. Actor y fecha los fija el servidor de datos, no el navegador.

## Demo independiente

La demo anterior permanece en 5174. Para arrancar otra instancia local con datos ficticios:

```powershell
npm run build:api
$env:VEXOR_DEMO_WEB_PORT='5175'
$env:VEXOR_DEMO_API_PORT='3002'
node --import tsx backend/scripts/demo-browser.ts --stock-qa
```

Abrir `http://localhost:5175`, iniciar con `qa.mercado@example.test` y contraseña ficticia
`Vexor-demo-local-2026`, elegir Lencería QA → Inventario → Ver existencias.
Prepara tres modelos, 27 combinaciones y dos locales, con conteos y mínimos y un traslado parcialmente
recibido. Es una base desechable; no usa credenciales de Supabase ni escribe en Vercel.

Validación automatizada: aislamiento por negocio/local, historial inmutable para el rol de aplicación,
reintentos, exceso de recepción, conteo pendiente, mínimos antes del conteo, salida simultánea y saldo
del catálogo. Pruebas de interfaz de recepción parcial, ajuste físico, selección de celda y conteo pendiente.

Validación previa a publicación: 521 comprobaciones HTTP/integración, 88 pruebas de interfaz,
typecheck, compilación y revisión del paquete público sin secretos locales.

Prueba manual de interfaz: salida de 2 unidades, recepción de 1 con motivo, ajuste al mínimo y revisión
de la alerta. La evaluación móvil se hace con viewport de navegador; no sustituye una prueba en iPhone físico.
