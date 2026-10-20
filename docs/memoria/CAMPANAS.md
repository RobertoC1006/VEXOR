# Campañas y etiquetas desprendibles

Última actualización: 2026-10-20 (America/Lima).

Detalle de las decisiones confirmadas para campañas. Consultar desde [Memoria del proyecto](../MEMORIA_PROYECTO.md) solo cuando la tarea lo requiera. Las elecciones abiertas se identifican al final; no constituyen requisitos resueltos.

## Alcance y configuración — confirmado

- El modo campaña es opcional y debe configurarse según el negocio, los rubros que vende y su forma real de trabajar. No se activa ni se impone automáticamente por Navidad, Año Nuevo u otra fecha, ni por pertenecer a un rubro.
- El flujo de etiquetas descrito aquí nace del puesto de lencería del usuario. No es el único flujo permitido de campaña ni una obligación para otros negocios.
- Un negocio puede vender lencería y zapatos u otros rubros; no debe asumirse que todos necesitan el mismo tratamiento. El alcance concreto de la configuración por puesto, rubro o producto sigue pendiente de diseño.
- Una florería que atiende normalmente el 24 de diciembre puede continuar con la venta habitual, sin pasar sus productos a registro posterior. Si decide usar campaña, su configuración debe responder a su trabajo. El ejemplo no establece una regla universal para florerías.
- Durante una campaña no debe obligarse al vendedor ni al propietario a operar el sistema mientras atienden una aglomeración. La venta desde el punto de venta permanece disponible como opción rápida; no sustituye obligatoriamente el registro físico mediante etiquetas.

## Contexto del piloto

- En los días de mayor afluencia trabajan entre cinco y siete vendedores temporales, con poco espacio y varias ventas simultáneas. Mostrar prendas, embolsar y cobrar ya ocupa sus manos.
- El usuario y su madre, dueña del negocio, habían pensado probar etiquetas desprendibles antes de esta definición. La prueba operativa sigue siendo necesaria; aceptar el flujo no significa que ya se haya validado en una campaña real.
- El efectivo se reúne en dos bolsos, de la madre y la hermana del usuario, y se cuenta después en casa. No se impone una nueva caja central ni se reintroducen apertura, cierre o arqueo de caja.

## Flujo de etiquetas — confirmado

1. **Preparación previa.** VEXOR debe generar etiquetas imprimibles y desprendibles vinculadas a los productos registrados. En el ejemplo del usuario se preparan una o dos semanas antes; no es un plazo obligatorio para todos. Se colocan en las prendas que se quieren controlar. La impresora y el formato todavía no están elegidos.
2. **Atención y cobro.** Mostrar una prenda no genera una venta. Cuando la compra se completa, se cobra, se embolsa y se desprenden las etiquetas correspondientes; no desprenderlas mientras el cliente aún decide. Para el piloto se contempla una etiqueta por prenda; otras presentaciones y rubros requieren definir su equivalencia.
3. **Conservación física.** Guardar las etiquetas en un recipiente previsto para esa jornada, separando las pendientes de registrar de las que corresponden a ventas ya hechas en el punto de venta. Al procesarlas después, separar también las ya registradas. Pueden ser compartimentos de una caja, sin exigir varios recipientes grandes.
4. **Registro posterior.** Registrar los productos respaldados por las etiquetas mediante escaneo sucesivo o agrupando etiquetas iguales e ingresando sus cantidades. No exigir crear una venta completa por cada etiqueta ni reconstruir qué prendas compró cada cliente.
5. **Trabajo por tandas.** Guardar el avance y retomarlo después, mostrando cantidades ya registradas y permitiendo corregir errores. La fecha de captura posterior no debe confundirse con la jornada a la que pertenecen las salidas.
6. **Revisión de diferencias.** Comparar las existencias esperadas con el conteo físico una vez considerados los registros y movimientos pendientes. Las diferencias quedan por revisar; pueden deberse a ventas sin etiqueta, prendas mezcladas, errores o hurtos. No clasificarlas automáticamente como robos.

## Cinco mejoras aceptadas por el usuario

1. **Identificación legible.** Además del código, incluir nombre corto y los datos que distingan lo que se descuenta, como modelo o talla cuando correspondan. No imponer atributos de lencería a todos los rubros. El precio puede aparecer como referencia; no prueba el importe final cobrado cuando hubo negociación o descuento.
2. **Separación por estado.** Diferenciar físicamente etiquetas pendientes, etiquetas ya procesadas y las correspondientes a ventas ya registradas en el punto de venta. Esta separación evita volver a contar productos. Las etiquetas de devoluciones deben apartarse para revisar el caso; el flujo completo de devoluciones aún está pendiente.
3. **Procesamiento reanudable.** Permitir registrar cientos de etiquetas por tandas, guardar y continuar otro día, consultar el progreso y corregir cantidades equivocadas.
4. **Identificación individual opcional.** Para el procesamiento por escaneo, evaluar un identificador propio de cada etiqueta además del código del producto, que permita advertir que ya fue registrada. Es una opción aceptada para evaluar, no una obligación de serializar cada prenda del negocio. Si solo se agrupan etiquetas y se ingresan cantidades, no prometer detección individual automática de duplicados; la separación física es parte del control.
5. **Reposición sin alterar existencias.** Reimprimir una etiqueta rota o perdida no crea otro producto ni suma unidades al inventario. Permitir inutilizar la anterior para evitar que, si aparece después, se registre accidentalmente como otra salida. La identificación necesaria para reconocer automáticamente una etiqueta anulada requiere precisar el diseño.

## Total vendido y coexistencia con el punto de venta — confirmado

- Permitir ingresar el total vendido de la jornada. Los S/15 000 del ejemplo incluyen efectivo, Yape y Plin; no representan solo efectivo ni ganancia. No se exige identificar a los titulares de los QRs.
- Ese total ya incluye lo vendido mediante el punto de venta. No sumar nuevamente esos importes al total declarado ni sumar un nuevo ingreso por cada etiqueta procesada.
- Ejemplo de interpretación: si el total del día es S/15 000 y el punto de venta ya registró S/2 000 de esa misma jornada, el total sigue siendo S/15 000. La diferencia de S/13 000 corresponde al importe aún no registrado individualmente; no permite deducir por sí sola cantidades por producto ni asignar precios a cada etiqueta.
- Los productos vendidos por el punto de venta ya tienen su salida registrada. Sus etiquetas se separan y no vuelven a descontar existencias durante la captura posterior.
- Las etiquetas pendientes respaldan salidas de productos que todavía deben incorporarse al registro. Una vez incorporadas, no pueden volver a producir la misma salida.
- No exigir que la suma de precios de referencia impresos coincida con el dinero declarado: puede haber descuentos. No inventar ventas individuales, precios efectivos o descuentos para forzar una coincidencia.
- Este registro diario agregado no reconstruye automáticamente el detalle de cada compra, el medio de pago de cada etiqueta ni ganancias por producto. El tratamiento del desglose por medio de pago está pendiente.

## Límites del inventario y correcciones — confirmado

- Durante el pico y hasta completar el procesamiento, las existencias del sistema pueden estar desactualizadas. Recoger etiquetas no garantiza controlar toda salida ni obtener inventario exacto en tiempo real.
- Una etiqueta debe identificar el producto, variante o presentación al nivel en que se controla su existencia. Si falta ese desglose, el sistema no debe inventarlo.
- Si había 100 unidades y se registran 30 salidas por etiquetas, se esperan 70, suponiendo que no hubo otros movimientos. Si físicamente hay 68, existen dos unidades de diferencia por investigar; no dos hurtos confirmados.
- Si una prenda inicialmente considerada faltante aparece después al ordenar, permitir corregir la diferencia conservando constancia de lo ocurrido. No registrar una compra o devolución ficticia ni sumar otra vez una unidad que nunca se había descontado.
- Antes de ajustar por un conteo, considerar ventas del punto de venta, etiquetas pendientes y otros movimientos. Evitar descontar una venta mediante etiqueta si ya quedó absorbida por un conteo corregido; el procedimiento concreto de conciliación está pendiente.
- Se mantiene la decisión general de que los artículos todavía no registrados se venden fuera de VEXOR. Esta modalidad permite posponer la captura de salidas de productos incorporados; no aprueba por sí sola una venta libre de productos desconocidos.

## Validación operativa acordada

- Probar con el usuario y su madre una tanda pequeña antes de imprimir para toda la campaña: colocar, desprender, recoger, mezclar y registrar etiquetas.
- Comprobar facilidad de desprendimiento, lectura, recuperación y tiempo de procesamiento posterior. Usar la prueba para elegir tamaño, material y equipo; no comprar ni imponer una impresora concreta como decisión ya tomada.

## Decisiones pendientes

- Campos y opciones concretas de la configuración de campaña, responsables y alcance por puesto, rubro o producto; otros flujos de campaña adaptados a otros negocios aún no están definidos.
- Diseño de la venta rápida opcional, sin asumir que autoriza ventas libres de artículos no registrados.
- Tipo de impresora, papel o material, dimensiones, desprendimiento, formato de código, cantidades a imprimir y venta u oferta del equipo. El usuario contempla ofrecer una impresora, pero no ha elegido modelo ni condiciones comerciales.
- Elección de identificación individual y cómo anular o reemplazar etiquetas; relación entre escaneo individual, captura agrupada y prevención de repeticiones.
- Registro de presentaciones como paquetes o pares, equivalencias y situaciones con varias etiquetas por una compra. El ejemplo de una etiqueta por prenda no fija una regla universal.
- Detalle por medio de pago, correcciones del total diario y tratamiento de discrepancias entre el total declarado y las operaciones ya registradas.
- Conciliación con conteos, captura parcial de etiquetas, ventas y movimientos offline o pendientes de sincronizar, devoluciones y anulaciones. No se ha elegido implementación técnica.
