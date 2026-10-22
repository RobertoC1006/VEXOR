# Dashboard y conteo dirigido — verificación del 22/10/2026

## Resultado

- Inicio sigue la referencia visual general: saludo, cuatro indicadores, gráfico de avance por local, cambios recientes, alertas y accesos al trabajo pendiente.
- El resumen consulta datos del negocio y de los locales autorizados. No genera cifras de ventas, ticket promedio ni series de ventas todavía inexistentes.
- Los modelos no suman un conteo adicional: se cuentan sus combinaciones. Los borradores no suman unidades confirmadas ni activan alertas.
- «Ir a contar el inventario» filtra por el modelo y conserva el local seleccionado en el catálogo. Cada combinación tiene además acceso a su conteo exacto, incluso fuera de la primera página.
- El conteo directo abre el formulario una sola vez si hay una única fila pendiente y permisos. Un conteo confirmado se consulta sin reabrir su edición. Un local no disponible no se sustituye silenciosamente.
- Se comparte la condición de alerta con el filtro de catálogo: cantidad confirmada menor o igual al mínimo configurado por producto/combinación y local.
- No requiere migración nueva.

## Demo local aislada

Ejecutar desde la raíz `npm run demo:browser`. La cuenta ficticia `qa.mercado@example.test` utiliza la contraseña de demostración impresa por ese comando. Sus negocios son Lencería QA y Abarrotes QA. La base es desechable y no usa los datos de Vercel; al reiniciarla, las operaciones manuales de esta sesión desaparecen.

Pruebas realizadas mediante la interfaz:

1. Iniciar sesión como María QA, elegir negocio y recorrer Negocio → Puestos → Preferencias → Listo.
2. Lencería: guardar rubro, descripción, mercado/pabellón/número y cambiar los detalles sugeridos a Talla, Copa y Color.
3. Crear Brasier Aurora QA con seis combinaciones y códigos distintos; verificar paginación de cinco y la sexta combinación en la segunda página.
4. Crear Ropa interior de dama → Brasieres y asignarla al modelo ya creado sin perder sus combinaciones.
5. Seleccionar Puesto piloto y abrir desde la segunda página el conteo exacto de 42 / B / Negro.
6. Guardar borrador de tres unidades; revisar y confirmar. Configurar mínimo cinco. La alerta abre esa misma combinación y ese local.
7. Verificar el resumen: un modelo, seis combinaciones, tres unidades confirmadas, once conteos pendientes entre dos locales, una alerta; Puesto piloto 1/6 confirmado (17 %).
8. Probar el botón inferior del modelo: muestra únicamente sus combinaciones con paginación y no abre arbitrariamente la primera.
9. Cambiar a Abarrotes QA: resumen vacío independiente. Seleccionar su plantilla intermedia (Marca, Contenido; detalles Sabor, Contenido), crear Agua 625 ml QA y verificar el acceso directo a su conteo.
10. Reutilizar entre negocios el código QA-AURORA: permitido. Intentar repetirlo en Abarrotes QA: rechazado con «Ese código ya identifica un producto de este negocio».
11. Verificar escritorio y viewport móvil de 375 × 812 (ancho útil observado 360 px por la barra/entorno); sin desbordamiento horizontal. No constituye prueba de cámara en un iPhone físico.

Evidencias locales excluidas de Git: `test-results/dashboard-qa/dashboard-local.png`, `dashboard-movil.png` y `conteo-dirigido.png`.

## Comprobaciones automatizadas

- 461 comprobaciones HTTP/integración con PostgreSQL real desechable, cuenta SQL restringida, RLS y autenticación simulada firmada.
- 73 pruebas de interfaz en 18 archivos.
- Typecheck de backend y frontend, build de producción y revisión del bundle público sin secretos correctos.
- Casos nuevos: filtro por modelo/hoja, paginación hasta la última combinación, UUID ajeno o inválido, estados pendiente/alerta, resumen sin permisos, aislamiento entre negocios y navegación conservando local.

## Feedback y recomendaciones

- Mantener separados categoría, datos comunes del modelo y detalles de combinación; los datos editados conservaron las seis combinaciones.
- Mantener «Contar esta combinación» además del acceso general del modelo: elimina la selección repetida cuando el usuario ya sabe cuál necesita.
- Próxima mejora recomendada: que el paso Listo resuma lo guardado y señale campos de ubicación aún incompletos. Actualmente invita a revisar, pero no certifica que toda la configuración esté completa.
- Priorizar una prueba con el iPhone físico para cámara, permisos y latencia real. La revisión responsive de escritorio no valida esos comportamientos del dispositivo.
- Conectar ventas y ticket promedio cuando se implemente ventas; el gráfico actual mide preparación del inventario, no ingresos.
