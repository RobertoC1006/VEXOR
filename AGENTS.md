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

Esta es memoria local y revisable del proyecto. No implica que se haya activado o modificado la memoria global de Codex.
