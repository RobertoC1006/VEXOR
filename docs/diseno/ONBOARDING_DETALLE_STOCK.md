# Configuración guiada, detalle y stock mínimo

## Configuración

Mi negocio organiza el flujo en Negocio, Puestos, Preferencias y Listo. El nombre, rubro libre, descripción y miniatura se guardan en el primer paso. Mercado, pabellón, número y referencia pertenecen a cada local y se editan en Puestos con el formulario existente. Se conserva el límite vigente de un puesto activo habilitado para venta.

Elegir una guía de rubro propone un nivel y campos de registro. El comerciante revisa o adapta la propuesta en Preferencias. Se aplica a productos nuevos; cada ficha conserva su propio nivel y puede cambiar sus campos. No se modifican productos existentes ni se crean categorías silenciosamente. La preferencia de 5 o 10 elementos inicializa el catálogo y sus combinaciones; el usuario puede cambiarla en cada lista.

La miniatura del negocio reutiliza la preparación de fotos del catálogo: JPEG reducido, original y metadatos no almacenados. El perfil privado usa RLS y el permiso negocio.editar. Editar parcialmente preferencias conserva las demás claves.

## Catálogo

Los filtros de categoría y local usan tarjetas con búsqueda y páginas de 5 o 10 opciones. Al tocar una fila o el nombre se abre un detalle de consulta. El mismo modal contiene las pestañas Información y Combinaciones, con navegación por teclado. La edición se abre como acción explícita. Se conserva la posición y la página del catálogo al cerrar.

## Mínimos por local

El mínimo se configura para una unidad concreta de inventario: producto simple/intermedio o combinación de un modelo avanzado, por puesto/almacén. No se añade un conteo ni un mínimo adicional al modelo. Vacío significa sin umbral; los valores configurados son enteros positivos. Se requiere inventario.confirmar en el local, además del acceso al catálogo. El guardado usa versión y serializa actualizaciones para evitar sobrescrituras.

El medidor muestra cobertura del mínimo, no capacidad máxima: rojo al llegar o bajar del mínimo y verde al superarlo. Conserva cantidad, mínimo y texto; no depende exclusivamente del color. Los borradores no se presentan como existencias confirmadas. Los datos pendientes nunca se convierten en cero.

Un modelo avanzado muestra el total solo con todos los conteos confirmados y un mínimo total solo cuando todas las combinaciones tienen mínimo. Además informa cuántas combinaciones están en alerta, aunque la suma total supere el mínimo agregado. No se envían notificaciones externas; la alerta es visual.

## Comprobaciones

Pruebas de API con PostgreSQL real: perfiles privados, fotos válidas/inválidas, preferencias parciales, permisos de mínimo, RLS entre negocios, versión obsoleta, conteos pendientes y estados agregados. Pruebas de interfaz: navegación, tarjetas, consulta antes de editar y stock pendiente/bajo/en el mínimo/suficiente. Recorrido manual local: rubro, plantilla, preferencias, creación de modelo, detalle y combinaciones, conteo y confirmación, mínimo 5 con stock 3 (rojo), mínimo 2 con stock 3 (verde), y modal móvil de 375 px sin desbordamiento.

La migración 20261022000100 es manual. Se verifica la API antes de publicar la web nueva; no se ejecutan migraciones al arrancar.
