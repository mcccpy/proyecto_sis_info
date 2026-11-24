# Revision de historias y pruebas del backend

Matriz actualizada contra `historias.txt`, `reglas.md`, controladores, servicios, repositorios y triggers SQL. "Probado" indica que la suite se ejecuto contra PostgreSQL y HTTP; no cubre pantallas ni integraciones externas de almacenamiento de archivos.

| Historia | Estado | Evidencia ejecutada / pendiente |
| --- | --- | --- |
| Alta, rol adicional y cambio de modo | Probado | Alta inicial como cliente y reparador; agregar rol; documentos y perfil; aprobaciÃ³n/rechazo; cambio de rol y login. |
| Login | Probado | Hash scrypt, correo sin distinguir mayusculas, credenciales invalidas, JWT ausente/alterado, perfil y cambio de rol. |
| Moderacion de reparadores y documentos | Probado | Filtros por busqueda/estado, aprobar y rechazar documentos y perfil; no se permite aprobar perfil con documentos rechazados. |
| Roles y categorias admin | Probado | Crear/asignar/revocar/eliminar rol temporal; crear/asignar/quitar categoria de reparador y de trabajo. |
| Cobertura y busqueda directa | Probado | Busqueda HTTP en anillos verde, amarillo, rojo y fuera de zona; solicitud directa fuera del anillo rojo permitida segun decision del usuario; radios y orden cubiertos en unitarias. |
| Trabajos abiertos y directos | Probado | Publicar, feed, dashboard, postular, listar postulaciones, cotizar, aceptar; rechazar solicitud directa y verificar en PostgreSQL que el trigger la republica y otro reparador la explora. |
| Compromisos del reparador | Probado | Solicitud directa y servicio aparecen en sus secciones; la visita realizada mueve el servicio a en progreso. |
| Visitas | Probado | Crear varias, cancelar por el cliente antes de iniciar, rechazar cancelacion del reparador y despues del inicio; solapamientos y fechas tambien en unitarias. |
| Bitacora y notas | Probado | Eventos del trigger y nota del reparador visibles para el cliente. |
| Ajustes de presupuesto | Probado | Aumento cliente aprobado y rechazado por admin; disminucion del reparador aplicada; la propuesta conserva el monto correcto. |
| Pago y cierre | Probado | Declarar, confirmar, aprobar y completar; no completa sin pago valido (unitarias). |
| Calificacion y reclamo | Probado | Calificacion de cliente; reclamo en revision, resuelto y rechazado; permisos y limite de 60 dias. |
| Cancelacion de servicio | Probado | Cliente cancela y trigger republica registrando su identidad y motivo. La solicitud del reparador queda pendiente: rechazo conserva servicio y trabajo cerrados; aprobacion (`resuelto`) cancela y republica. |
| Documentos de trabajo | Probado | Adjuntar al publicar y durante el trabajo; listar para participante/admin; usuario ajeno recibe 403; filtros administrativos. Las pruebas usan referencias `test://`, no suben archivos binarios a un servicio de almacenamiento. |
| Autorizacion | Probado en rutas probadas | JWT y rol vigente obligatorios; actor/body/query se coteja con `sub`. Trabajo, propuesta, servicio, pago, visita, reclamo, calificacion y documentos por ID rechazan usuario ajeno. Registro, login, categorias y busqueda de tecnicos son publicos. |

## Decisiones de negocio incorporadas

- Solo el cliente cancela una visita, y solo antes de iniciar el servicio.
- Una solicitud de cancelacion del reparador queda pendiente; `resuelto` la aprueba y `rechazado` conserva el servicio.
- La busqueda muestra tecnicos fuera de cobertura al final, y el cliente puede solicitarles directamente.
- El rechazo de solicitud directa republica por el trigger SQL. El backend no repite esa actualizacion.

## Resultado verificado

- Pruebas unitarias: 33 aprobadas.
- Integracion HTTP + PostgreSQL: 2 pruebas aprobadas, con numerosas aserciones en el flujo integral.
- Compilacion Nest: aprobada.
- La suite limpia sus propias filas temporales, no ejecuta `TRUNCATE` y no toca los 100 datos sembrados.

Los escenarios usan referencias de archivo simuladas. Se confirmo mantener URLs y no implementar carga binaria o almacenamiento externo por ahora.

## Alcance confirmado

- Los documentos se mantienen como referencias URL (`ubucacion_archivo`); no se agrega carga binaria ni almacenamiento externo.
- Los roles base `cliente` y `reparador` siguen protegidos contra borrado. Los roles personalizados se pueden crear y eliminar.
