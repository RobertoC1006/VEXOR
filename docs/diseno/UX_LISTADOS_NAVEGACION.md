# Navegación y listados de VEXOR

Implementación en `codex/ux-navegacion-paginacion`, desde `main` en `03779ad`.

- El layout compartido empieza directamente con el módulo. El negocio actual, la identidad de la cuenta, la instalación y el cierre de sesión están en la parte inferior de la navegación de escritorio. En móvil se encuentran al pie del layout y en «Más».
- La barra móvil muestra Inicio, Productos e Inventario cuando están disponibles, y «Más» para los demás módulos. No necesita desplazamiento horizontal.
- Los listados muestran cinco elementos por página y permiten elegir diez de manera independiente. Las listas con cinco elementos o menos no añaden controles innecesarios. Cambiar el tamaño o los filtros vuelve al inicio; abrir una ventana no cambia la página ni los filtros del catálogo.
- Productos, Inventario y la consulta de combinaciones solicitan solo la página de la API. Los conjuntos ya cargados para configuración/acceso utilizan el mismo estado y control de paginación para su presentación: locales, equipo, roles, negocios e invitaciones.
- Las combinaciones se consultan en un modal. Alta y edición de productos, conteos, locales, categorías y roles usan el mismo componente. Crear invitaciones de equipo y revisar acciones de invitaciones de plataforma tampoco desplaza los listados.
- Los diálogos nativos mantienen el foco y aíslan el fondo; admiten Escape, un cierre visible y ventanas anidadas. El cierre queda bloqueado durante las acciones pendientes. Confirmaciones y cámara comparten este mecanismo; se retiraron las implementaciones de foco duplicadas y sus estilos anteriores.
- El editor mantiene todos los borradores y guarda el modelo con sus cambios conjuntamente, aunque muestre solo una página. Añadir una combinación abre su página. Las combinaciones guardadas presentan un resumen desplegable para editar solo el detalle elegido.

Verificación: typecheck, build y paquete público sin secretos; 62 pruebas de interfaz. Incluyen páginas de cinco/diez elementos, reducción de una lista, cambios en tres páginas de un editor con treinta combinaciones, bloqueo del cierre durante el guardado y devolución del foco y navegación móvil sin claves de React duplicadas.

Prueba local en navegador con datos aislados: siete productos, un modelo con doce combinaciones, cambio a diez elementos, retorno desde un modal sin perder la página del catálogo, edición conservada entre páginas y cierre de categorías devolviendo al editor. En viewport móvil se verificó ausencia de desbordamiento horizontal y navegación de cuatro accesos. Estas comprobaciones no equivalen a una prueba en un iPhone físico.
