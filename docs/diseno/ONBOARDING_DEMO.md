# Configuración inicial y demo local

## Recorrido

Invitación → creación de contraseña → aceptar acceso → **Tu negocio → Puestos y almacenes → Listo** → dashboard.

- Nombre y rubro son obligatorios al avanzar. Foto y descripción son opcionales.
- El rubro puede preparar una plantilla inicial; las preferencias no forman parte del asistente. Después se consultan o editan desde Mi negocio.
- El primer puesto se registra directamente con Siguiente. Los locales adicionales usan el formulario compartido. Se conserva el límite vigente de un puesto activo para venta; esta tarea no define cuotas nuevas de almacenes.
- El avance queda guardado en el servidor. Al volver se retoma el paso pendiente. No se puede saltar al final sin datos y un puesto activo.
- Antes de terminar, las rutas comerciales redirigen al asistente para el propietario. Los trabajadores ven que el propietario está preparando el negocio. Después, Mi negocio muestra una ficha editable sin repetir los pasos; Puestos y almacenes conserva su módulo propio.
- Los negocios anteriores a la migración conservan su acceso. Solo los nuevos empiezan en el paso cero.

## Probar

Desde la raíz: `npm run demo:browser`. Mantener el proceso abierto.

Abrir **http://localhost:5174/demo**. El correo simulado corresponde a Lucía Demo, `nuevo.mercado@example.test`. Al abrir la invitación se muestra la pantalla existente para crear una contraseña. Usar una contraseña inventada, de al menos doce caracteres. No se envía correo real y las credenciales de este simulador viven solo en memoria.

Después de crear la contraseña, aceptar la invitación de Mi nuevo negocio. Completar los tres pasos y pulsar Empezar a trabajar. La invitación es idempotente: volver a aceptarla no crea otro negocio ni reinicia la configuración. La demo usa una base desechable; reiniciarla borra sus operaciones.

Se mantienen las cuentas ficticias anteriores, incluida María QA, para consultar negocios ya configurados. Este script no carga credenciales privadas del alojamiento ni aplica migraciones remotas. El simulador de correo y autenticación solo se monta en desarrollo local.

## Verificación realizada

- 479 comprobaciones de API/integración: nueva empresa por invitación, persistencia, requisitos de cada paso, saltos rechazados, acceso ajeno rechazado, pasos idempotentes y completado que no se reinicia por peticiones antiguas.
- Adaptador de credenciales local: actualización autenticada, validación de longitud, acceso con la contraseña ficticia nueva y renovación de sesión.
- 82 pruebas de interfaz, incluidos guardado antes de avanzar, conservación de campos ante error, resumen, rutas directas bloqueadas durante el asistente, trabajador pendiente y primer puesto habilitado para venta por defecto.
- Typecheck de backend/frontend, build y revisión del bundle público correctos.
- Interfaz real: con invitado@example.test se aceptó Mercado Nuevo, se configuró Lencería Sol Demo, se recargó en el paso dos conservando el avance, se creó Puesto Sol con mercado/pabellón/número, se revisó Listo y se entró al dashboard. Mi negocio mostró la ficha directa y las preferencias sugeridas por el rubro.
- Invitación nueva de Lucía verificada hasta la pantalla para crear contraseña; se deja esa entrada al usuario para probar sus credenciales ficticias.
- Revisión a 375 × 812, ancho útil observado 360 px, sin desbordamiento horizontal; tres pasos en una fila.

Evidencias locales excluidas de Git: `test-results/onboarding-qa/resumen.png`, `resumen-movil.png`, `invitacion.png`.

Desarrollado y revisado en `codex/onboarding-inicial`. Publicación aprobada por el usuario el 23/10/2026. La migración `20261023000100_onboarding` se aplicó manualmente a vexor-dev, con historial y RLS forzada verificados; no se ejecutan migraciones al desplegar el servidor.
