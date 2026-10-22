# Catálogo visual y fotografías

Productos e Inventario comparten una tabla con foto, nombre, modelo o combinación, precio, stock y estado. En pantallas pequeñas, cada fila se presenta como tarjeta. Se conservan las páginas de 5 o 10 elementos y los editores en modal.

## Categorías

El administrador separa Nueva categoría de la selección para editar. Las categorías se buscan y eligen mediante tarjetas paginadas. El mismo selector permite elegir una categoría superior, excluyendo la propia categoría y sus descendientes. Las sugerencias para combinaciones son opcionales y conservan las reglas de herencia existentes.

## Fotos privadas

La ficha permite tomar una foto o elegirla de la galería. El navegador prepara una miniatura JPEG de hasta 20 000 caracteres, sin copiar los metadatos originales; admite JPG, PNG y WebP de hasta 20 MB. El original no se almacena. La miniatura pertenece al producto o modelo y sus combinaciones la comparten.

La migración manual 20261021000600 crea productos_fotos con RLS forzada. La lectura usa los permisos del catálogo; la escritura requiere productos.gestionar. Las imágenes se consultan por un endpoint autenticado separado para no repetir base64 en las listas ni en la auditoría genérica de productos. Las escrituras de foto, modelo y combinaciones son atómicas y mantienen el control de versión. El servidor limita tipo, tamaño y firma JPEG; no realiza una decodificación completa de la imagen.

## Precio y stock

El catálogo muestra el rango de precios de las combinaciones. Los valores pendientes no se interpretan como cero. El stock se consulta por local con los permisos de inventario existentes. En modelos avanzados solo se presenta un total cuando todas las combinaciones están confirmadas; un conteo parcial muestra su progreso. Se conservan las existencias de combinaciones pausadas. No se añade un conteo extra al modelo.

Inventario muestra el estado de conteo junto a la cantidad y conserva las acciones de borrador y confirmación. No se inventan umbrales de stock bajo ni gráficos sin datos.

## Validación

- 421 comprobaciones de API: aislamiento entre negocios, permisos, fotos inválidas, transacciones, versiones, foto heredada, precios y stock desconocido, parcial y confirmado.
- Pruebas de migraciones y RLS en PostgreSQL y PGlite.
- Pruebas de interfaz automatizadas y comprobación manual en navegador: categorías y subcategorías, carga y persistencia de miniatura, dos combinaciones, confirmación de conteo y diseño de 390 px sin desbordamiento horizontal.
- La apertura de la cámara física en iOS queda para la prueba en el dispositivo del usuario.

## Publicación

Aplicar la migración explícitamente en desarrollo; desplegar y verificar la API antes de publicar el frontend que consulta stock por local. No se ejecutan migraciones al arrancar el servidor.
