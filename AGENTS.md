# VEXOR — contexto para agentes

Usa el contexto disponible de la conversación. Consulta [docs/MEMORIA_PROYECTO.md](docs/MEMORIA_PROYECTO.md) solo cuando falte contexto necesario para la tarea, por ejemplo al retomar trabajo en una conversación nueva. No la leas por rutina ante cada pregunta; consulta únicamente las secciones necesarias.

- Comunícate con el usuario en español.
- Distingue las decisiones del usuario de las recomendaciones del asistente. Una propuesta o un pendiente no constituye un requisito aprobado.
- Edita la memoria únicamente cuando el usuario indique expresamente que algo ya quedó decidido o definido, o pida actualizarla. Una pregunta, idea, recomendación o exploración no autoriza por sí sola una edición. No actualices archivos por rutina en cada respuesta.
- Al realizar una actualización autorizada, las instrucciones actuales del usuario prevalecen: reemplaza acuerdos obsoletos, elimina duplicados y pendientes resueltos, y conserva solo una explicación breve cuando evite confusiones. No borres decisiones vigentes ni conviertas supuestos en acuerdos.
- Mantén `AGENTS.md` por debajo de 32 000 bytes en UTF-8 y tan breve como sea útil. Reserva aquí instrucciones operativas; guarda los detalles del producto en la memoria. Comprueba el tamaño al editarlo.
- Si la memoria crece, separa detalles por tema con un índice breve para consultar solo lo necesario. No acumules transcripciones ni historiales extensos.
- Desarrolla el alcance solicitado en cada tarea; la memoria del producto no es una instrucción para implementar todas sus funciones de una vez.
- Diseña para comerciantes de mercados peruanos, uso rápido desde celulares y conectividad intermitente. El piloto de lencería no limita el sistema a ese rubro.

## Aprobación de bloques y flujo Git

- Cuando el usuario confirme que un bloque quedó aprobado (por ejemplo, «listo, queda ese cambio»), realizar las verificaciones pertinentes, crear un commit con los cambios de ese bloque y hacer push a la rama actual, sin solicitar otra confirmación para esos pasos. Una idea, pregunta o cambio aún en revisión no activa este cierre.
- No incluir credenciales, secretos, resultados locales ni cambios ajenos al bloque aprobado. Informar el commit, la rama y el resultado del push; no darlo por completado si falla.
- Trabajar por funcionalidades o fases. Cuando se defina el siguiente bloque, crear su rama con prefijo `codex/` desde el estado aprobado y publicado. No inventar la siguiente fase ni crear otra rama solo por terminar la actual.
- `main` es la rama estable de publicación para Vercel y Render. Desarrollar en ramas `codex/` creadas desde `main`; probar y revisar antes de integrar. Commit y push de una rama de trabajo no autorizan por sí solos un merge a `main`: integrarlo cuando el usuario apruebe su publicación, comprobar el resultado integrado y verificar ambos despliegues. No hacer push forzado ni migraciones automáticas para publicar.

## Calidad y organización del código

- Antes de añadir código, revisa las soluciones existentes y reutilízalas cuando corresponda. Evita métodos redundantes y variantes de una misma lógica que puedan divergir.
- En frontend, comparte layouts, navegación, botones, campos y otros componentes o fragmentos repetidos. Separa la presentación de la lógica reutilizable de interacción y acceso a datos.
- En backend, concentra cada regla de negocio en el módulo responsable y reutiliza servicios, validaciones y utilidades comunes. El frontend puede validar para ayudar al usuario, pero la autorización y las reglas de negocio se aplican en el servidor; las restricciones y RLS de la base siguen como protección adicional.
- Mantén archivos cohesionados, nombres claros y responsabilidades delimitadas. Al acercarse a unas 500 líneas, revisa si hay responsabilidades separables o duplicación. Es una referencia, no un límite rígido: conserva el código necesario y no lo fragmentes artificialmente para cumplir una cifra.
- Extrae abstracciones cuando haya una responsabilidad o reutilización clara; evita tanto copiar lógica como crear capas o componentes innecesarios. Al modificar código, comprueba que la lógica compartida conserve el comportamiento de sus consumidores.

Esta es memoria local y revisable del proyecto. No implica que se haya activado o modificado la memoria global de Codex.
