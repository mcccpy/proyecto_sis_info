# Pruebas manuales — demostración inicial

### Ambiente

- Backend `/api/health` devuelve HTTP 200.
- Frontend carga sin errores visibles en navegador.
- PostgreSQL conserva tablas después de reiniciar backend.

### Identidad y permisos

1. Registrar cliente; confirmar que `usuario.rol = CLIENTE`. Repetir con empresa.
2. Intentar registrar `ADMIN` en el formulario/API; el servidor debe responder 403.
3. Registrar trabajador: debe estar no aprobado.
4. Entrar con técnico no aprobado; `GET /api/solicitudes/disponibles` debe responder 403.
5. Perfil de técnico con categoría y zona válida: debe poder guardarse.
6. Entrar administrador, aprobar; el técnico aparece en búsqueda de clientes.
7. Intentar aprobar con cliente: debe responder 403.
8. Contraseña incorrecta: `401 Unauthorized`.

### Solicitudes y privacidad

9. Cliente crea solicitud válida: se guarda en PostgreSQL.
10. Solicitud con datos inválidos: `400 Bad Request`.
11. Cliente no ve solicitudes de otros clientes desde `mis solicitudes`.
12. Trabajador aprobado ve solicitudes abiertas, sin atributo `direccion`.
13. Probar creación de cuarta solicitud abierta como cliente: debe rechazarse (regla provisional de demo).
14. Empresa puede crear hasta 10 solicitudes abiertas (regla provisional de demo).

### Presupuestos

15. Técnico aprobado envía precio, costo visita y tratamiento de materiales.
16. Técnico no aprobado no puede presentar propuesta.
17. Cliente dueño de solicitud consulta propuestas.
18. Cliente de otra cuenta no puede consultarlas.
19. Cliente acepta propuesta: cambia a ACEPTADA; solicitud pasa a ASIGNADA y demás propuestas RECHAZADAS.
20. Repetir aceptación: debe rechazarse.

### Calidad

- Reiniciar los dos procesos y comprobar persistencia de datos.
- Probar navegador móvil: navegación, tarjetas, formularios y scroll horizontal de pestañas.
- Ejecutar `npm run build` en `frontend` y `backend`.
