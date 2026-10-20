# Memoria del proyecto VEXOR

Última actualización: 2026-10-20 (America/Lima).

## Propósito y estado actual

VEXOR será un SaaS multitenant para ayudar a comerciantes de mercados peruanos a gestionar sus negocios de forma sencilla y rápida desde el celular. El primer piloto será el negocio familiar de lencería del usuario. El diseño debe contemplar otros rubros desde su base: ropa, zapatos, abarrotes, juguetes, flores y otros.

Estamos definiendo necesidades, módulos y flujos con el usuario, paso a paso. Todavía no se ha aprobado una especificación completa de implementación. Al crear esta memoria, el repositorio solo contenía `.git`; no había aplicación, stack ni pruebas implementadas.

## Cómo interpretar esta memoria

- **Confirmado:** el usuario lo solicitó o eligió expresamente.
- **Propuesto:** recomendación del asistente que aún requiere definición o aceptación.
- **Pendiente:** decisión abierta; no asumir que tiene una respuesta acordada.

Las instrucciones posteriores del usuario prevalecen. Mantener este documento al día sin presentar sugerencias como decisiones tomadas.

## Mantenimiento y consumo de contexto — confirmado

- Guardar cada decisión confirmada al tomarla, sin esperar a que el usuario vuelva a pedirlo.
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

## Decisiones confirmadas

### Servicio, negocio y puestos

- Un tenant representa un negocio.
- El administrador de VEXOR vende el servicio, registra al negocio y lo vincula con su propietario.
- El propietario accede con sus credenciales al área de comerciante y configura su negocio dentro de las funciones y límites contratados.
- La primera versión tendrá un único plan básico. Otros planes y capacidades se contemplan para versiones posteriores.
- **El plan básico incluye un puesto activo por negocio.**
- El modelo general debe permitir varios puestos por negocio, aun cuando el plan inicial limite los activos.
- Un negocio puede tener puestos del mismo rubro o de rubros diferentes. Un solo puesto puede vender varios rubros.
- La configuración debe adaptarse al negocio y sus productos, sin quedar restringida al piloto de lencería.

### Uso móvil, venta y pagos

- Se elige una PWA con funcionamiento offline como dirección del producto.
- La interfaz debe ser intuitiva y rápida. El uso del sistema debe encajar con la atención real del puesto.
- La vendedora no tiene que registrar cada producto que muestra al cliente. Registra lo que se decide comprar.
- Habrá venta directa y carritos en espera para atender simultáneamente a varios clientes.
- La venta habitual no debe exigir identificar al comprador.
- Debe permitir seleccionar productos y escanear códigos. Comprar un lector externo no será obligatorio.
- Los productos sin código deben poder registrarse y encontrarse con nombres que reconozcan los comerciantes.
- Se registran efectivo, Yape o Plin. No se requiere identificar al dueño o cuenta receptora.
- En efectivo, debe mostrar el total y permitir calcular el vuelto a partir del importe entregado.
- Se descartan apertura, cierre y arqueo de caja. Esto no elimina el registro de pagos, gastos ni reportes.

### Productos, inventario y compras

- Debe permitir incorporar mercadería que ya está en estantes, vitrinas o guardada, además de registrar nuevas compras.
- Debe registrar y permitir consultar ubicaciones para encontrar productos.
- El comerciante elige el detalle que necesita registrar. Los ejemplos de tres niveles no deben convertirse en campos rígidos u obligatorios por rubro.
- Marca, modelo, talla, copa, color y diseño son ejemplos de características; no una lista universal obligatoria.
- “Surtido” fue un ejemplo del usuario, no el nombre obligatorio de una modalidad ni una clasificación que se deba imponer.
- Se incluyen desde la primera versión compras y ventas por unidad, paquete, docena u otras presentaciones configuradas según el producto.
- El usuario aceptó como recorrido recomendado elegir puesto, preparar ubicaciones, registrar productos, asociar códigos, definir presentaciones y contar existencias iniciales. Debe adaptarse a la incorporación gradual y al rubro.
- **Inventario inicial por etapas:** cada producto empieza a descontar existencias cuando se confirma su conteo, sin esperar a terminar todo el puesto.
- **Un artículo todavía no registrado se vende fuera de VEXOR.** El usuario eligió esta opción sobre venta rápida o creación obligatoria del producto antes de vender. No introducir por defecto una venta libre para cambiar esa decisión.
- **Dos modos de ubicación configurables:** por defecto, total por puesto con ubicaciones de referencia; el negocio puede activar cantidades exactas por ubicación.

### Clientes frecuentes y descuentos

- La venta sigue sin exigir identificar al comprador. Se quiere una ficha opcional para clientes recurrentes, con nombre y teléfono, sin exigir DNI; este puede añadirse si el cliente lo brinda voluntariamente. Los campos mínimos exactos quedan por definir.
- Vincular compras a ese cliente permitirá consultar su historial y conocer qué productos suele llevar. Falta precisar si lo consulta solo el personal o también el cliente mediante un acceso propio.
- Los descuentos deben poder aplicarse a cualquier comprador, nuevo o frecuente, sin obligarlo a registrarse.
- El propietario configura las políticas y límites de descuento.
- En la venta se debe poder negociar indicando el total final o el descuento en soles: tres productos de S/18 suman S/54; cobrar S/50 equivale a descontar S/4. La interfaz concreta queda por diseñar y debe ser amigable.
- Las recomendaciones de productos a partir del historial, especialmente mediante IA, quedan como idea para explorar después. No se ha aprobado su implementación ni elegido proveedor o modelo para esta función; esto no revoca la ayuda básica con IA ya solicitada.

### Equipo, control e IA

- El propietario administra trabajadores y les concede acceso mediante roles y permisos. Ejemplos solicitados: vendedor, encargado y administrador del negocio.
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
- Un código puede identificar producto, variante o presentación. Varias unidades iguales pueden compartir código; no se propone serializar cada prenda.
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

### Permisos, auditoría e IA

- Roles iniciales editables: propietario, administrador del negocio, encargado y vendedor; permisos por acción y puesto asignado.
- Diferenciar ver un módulo de acciones como consultar costos, cambiar precios, aplicar descuentos, anular ventas o ajustar existencias.
- Identidad individual para cada trabajador y auditoría de operaciones y correcciones, conservando los registros anteriores.
- IA para orientar, preparar fichas para revisión y consultar cifras calculadas por el sistema, respetando permisos.
- Separar reportes (“cuánto vendí”) y auditoría (“quién cambió el precio”).
- Propuesta: IA con conexión y ayuda básica local disponible offline. La IA no debe ser indispensable para vender o registrar mercadería.

### Clientes frecuentes y negociación

- En la venta, ofrecer “Agregar cliente” como acción opcional, con búsqueda de fichas existentes antes de crear otra. Considerar nombre o apodo y teléfono opcional; no asumir que el nombre identifica de forma única ni que un teléfono no pueda compartirse.
- Para empezar, consultar el historial desde la ficha del cliente dentro del negocio; un acceso del comprador requiere definir identificación y privacidad por separado.
- Mostrar una acción “Aplicar descuento” con dos entradas alternativas: “Dejar total en” y “Descontar S/”. Calcular ambas sobre el mismo descuento y mostrar subtotal, descuento y total final, sin acumular dos rebajas por usar las dos entradas.
- Empezar por descuento sobre el total de la venta; el descuento por producto, porcentajes y promociones automáticas aún no están definidos.
- Conservar precios originales, descuento, total cobrado y trabajador responsable en el registro de venta. Proponer permisos de descuento por rol, límites por venta y autorización del propietario para excepciones; el comportamiento offline requiere definición.
- Mostrar productos comprados anteriormente o con mayor frecuencia sin necesitar IA. No conceder descuentos automáticos por ser cliente frecuente ni interpretar el historial como autorización para enviar mensajes.

## Mapa de módulos propuesto

Este mapa organiza la conversación; todavía no constituye un alcance completo aprobado para la primera versión.

- **Administración de VEXOR:** negocios, propietarios, suscripciones, planes y límites.
- **Inicio y configuración del negocio:** incorporación guiada, puestos, rubros y preferencias.
- **Productos:** catálogo, atributos, variantes, códigos, presentaciones y precios.
- **Inventario:** conteo inicial, existencias, ubicaciones, ajustes y traslados.
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
- Una existencia desconocida no equivale a cero. Falta definir la venta de productos con ficha creada pero conteo pendiente.
- Dos celulares desconectados no conocen inmediatamente las ventas del otro. Hay que definir sincronización, prevención de duplicados y conciliación.
- La confirmación del inventario inicial debe coordinar conteo, ventas y movimientos pendientes de los dispositivos; no está diseñado aún ese procedimiento.
- En ubicación orientativa no se conoce cuántas unidades hay en cada espacio. En modo exacto deben registrarse movimientos internos.
- Los reportes y ganancias no deben presentar datos incompletos o costos desconocidos como cifras completas.

## Pendientes para próximas conversaciones

1. Cerrar los flujos de alta, configuración, inventario inicial, venta, compra y recepción antes de elegir arquitectura.
2. Precisar cuándo un producto queda disponible para vender en el sistema y cómo se corrige un conteo confirmado.
3. Definir campos mínimos, características, variantes, códigos duplicados o ambiguos, equivalencias y búsqueda.
4. Precisar si el modo de ubicación exacta se configura por negocio, puesto o producto, y cómo se cambia de modo.
5. Definir precios por puesto/presentación, alcance de descuentos por venta o producto, límites y excepciones, pagos combinados, cambios, devoluciones y anulaciones. Están confirmados el descuento en soles o mediante total final y la configuración por el propietario.
6. Completar la matriz de permisos y la política de auditoría, incluidos uso offline y cambios de acceso.
7. Definir activación/desactivación de puestos, conservación de historial y ampliación del plan. Solo el límite de un puesto activo está confirmado.
8. Delimitar funciones y límites comerciales del plan básico: trabajadores, dispositivos, productos e IA, además de suscripción y cobro del servicio.
9. Delimitar las preguntas y acciones del asistente, revisión de propuestas, consumo y comportamiento sin conexión.
10. Definir alcance offline, preparación inicial del celular, sincronización, conflictos y recuperación de datos.
11. Precisar qué necesidades de otros rubros entran en la primera versión, como cantidades fraccionarias, venta por peso, lotes o vencimientos.
12. Elegir stack, arquitectura, almacenamiento, seguridad entre tenants y criterios de aceptación cuando los flujos estén suficientemente definidos.
13. Precisar campos mínimos y búsqueda de clientes frecuentes, corrección de fichas duplicadas, acceso al historial y si el comprador tendrá acceso propio. Las sugerencias personalizadas con IA quedan para después.

## Persistencia

Esta memoria es un archivo local del repositorio. `AGENTS.md` indica consultarla al retomar trabajo en VEXOR. No equivale a activar o modificar la memoria global de Codex.
