# Organización del equipo y primer sprint

| Integrante | Área responsable | Primera entrega que debe comprobar |
|---|---|---|
| Joel | Angular de clientes | Pantallas de búsqueda, publicación y mis solicitudes; conectar API real |
| Ian | Angular de trabajador/admin | Perfil técnico, envío de presupuesto y aprobación administrativa |
| Fernando | NestJS auth y trabajadores | Registro, login, hash de contraseñas, perfiles, aprobación y permisos |
| Mauritzio | NestJS solicitudes y ofertas | Creación, límites, consulta privada, propuestas y aceptación |
| Mateo | PostgreSQL + TypeORM | BD, entidades, relaciones, respaldo, migraciones y datos de prueba |

## Orden sugerido

**Primero, los cinco juntos:** Instalar Node, Git, preparar un repositorio privado y definir cómo usar Git. Mateo crea BD local y verifica que las tablas se generen.

**Luego, trabajo en paralelo:** Joel/Ian prueban frontend y componentes. Fernando valida autenticación y roles. Mauritzio valida reglas de solicitudes. Mateo revisa llaves, indices, restricciones y consultas.

**Integración obligatoria:** Una cuenta cliente crea solicitud; trabajador aprobado ve lista, manda oferta; cliente acepta; Mateo confirma que queda persistida. Registrar capturas de esta prueba.

## Buenas prácticas de colaboración

1. Nunca trabajar todos directamente sobre `main`.
2. Una tarea concreta por rama: `feature/joel-formulario-solicitud`, `feature/fernando-auth`, etc.
3. Antes de modificar `entities.ts` o `models.ts`, avisar a frontend y backend.
4. Unificar nombres de campos y códigos HTTP antes de integrar formularios.
5. Usar datos ficticios (no direcciones, correos ni identificaciones reales).
6. Antes de fusionar, ejecutar pruebas y mostrar resultados al compañero encargado del módulo relacionado.
