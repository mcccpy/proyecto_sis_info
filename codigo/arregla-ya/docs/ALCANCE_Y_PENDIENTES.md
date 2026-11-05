# Alcance real y pendientes del MVP

## Implementado como código inicial (a probar en las PCs del equipo)

- RF-01: registro de cliente, empresa y técnico; administración separada.
- RF-02: perfil simple de técnicos con categoría, experiencia, zona y disponibilidad textual.
- RF-03: aprobación simple de técnicos; no certificación profesional.
- RF-04 (parcial): endpoint de solicitudes de técnicos excluye dirección exacta; documentos personales aún no modelados.
- RF-05 (parcial): publicación con descripción, lugar, horario y URL opcional de foto (no se sube un archivo).
- RF-07 (provisional): 3/10 solicitudes no finalizadas ni canceladas, sujeto a validar alcance.
- RF-08 (parcial): búsqueda por categoría y zona; disponibilidad es texto, no filtro estructurado.
- RF-09 (parcial): cotizaciones con precio, visita, materiales, consulta y aceptación.
- RF-12 (parcial): estado de solicitud inicial y asignada, sin historial de eventos completo.
- RF-16 (parcial): aprobación administrativa; faltan zonas/categorías editables y reportes.

## Pendiente — NO demostrar como terminado

- RF-04 completo: almacenamiento privado de documentos y protección de toda la información sensible.
- RF-05: subida de fotos real, almacenamiento seguro y límites de tamaño.
- RF-06: estados EN_REVISION, ACTIVO, SUSPENDIDO y cambios autorizados; el prototipo inicia ACTIVA por simplicidad.
- RF-08: disponibilidad y calendario con filtros estructurados.
- RF-10: visitas con prevención real de solapamiento.
- RF-11: modificaciones de presupuesto con consentimiento explícito del cliente.
- RF-12: historial de todos los eventos, finalización/cancelación según reglas.
- RF-13: registros de declaraciones y confirmaciones de pago efectivo/QR, sin verificación bancaria automática.
- RF-14: calificaciones de servicios completados.
- RF-15: reclamos y registro de atención por soporte.
- RF-16: administración total de categorías, zonas y reportes básicos.
- Seguridad y calidad para producción: rate limit, roles robustos, cookies seguras, controles de concurrencia, auditoría, pruebas automáticas e2e, respaldos, migraciones TypeORM, accesibilidad, permisos para archivos, controles transaccionales adicionales.

## Reglas de negocio por decidir con docente

1. ¿Qué estados cuentan para el límite 3/10? Implementación temporal: solicitudes no CANCELADAS ni FINALIZADAS. Puede ser incorrecta respecto de la licitación.
2. ¿Quién pone una publicación EN_REVISION, ACTIVA o SUSPENDIDA y con qué criterios?
3. ¿Cuándo puede cancelarse una solicitud y cuáles son los plazos/consecuencias?
4. ¿Qué fases o confirmaciones marcan un servicio como finalizado?
5. ¿Cómo se confirma por ambas partes un pago en efectivo o QR?

**Separación importante:** los 17 HU y 30 CU son el alcance documental, no significan que estén implementados todos en el MVP.
