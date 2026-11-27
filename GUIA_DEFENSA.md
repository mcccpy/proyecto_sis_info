# ARREGLA YA — GUÍA RÁPIDA PARA MOSTRAR EL CÓDIGO EN LA DEFENSA

**Proyecto:** ARREGLA YA · **Rama de demostración:** `pruebas-integracion-joel`  
**Tecnologías:** Angular + TypeScript + NestJS sobre Node.js + Prisma + PostgreSQL + Docker / GitHub Codespaces.

> **Cómo usar esta guía:** colócala en la **raíz** de `/workspaces/arregla-ya-backend-prisma/` (al mismo nivel que `backend-prisma` y `codigo`). Abre este archivo y pulsa **Ctrl + Shift + V** para ver la vista previa. Los nombres azules son enlaces a los archivos reales. La ubicación aproximada de una línea puede cambiar si se edita el código: utiliza siempre **Ctrl + F** para buscar el nombre del método.
>
> **Importante:** esta guía se elaboró a partir de los archivos del proyecto y los cambios de integración compartidos para la rama de defensa. No equivale a haber auditado de nuevo el estado remoto actual de GitHub; si algún archivo cambió, localízalo con **Ctrl + P** y confirma el método. No afirmes que una función está terminada hasta probarla desde la interfaz y la base de datos.

---

## 0. ÍNDICE EXPRÉS: «EL DOCENTE PREGUNTÓ…, ABRE…»

| Pregunta del docente | Abre este archivo | Busca con Ctrl + F | Qué explicar |
|---|---|---|---|
| ¿Dónde está el menú y la navegación? | [app.component.ts](./codigo/arregla-ya/frontend/src/app/app.component.ts) | `router-outlet` | Contiene el encabezado, menú y salida de las vistas. |
| ¿Dónde se definen las páginas? | [app.routes.ts](./codigo/arregla-ya/frontend/src/app/app.routes.ts) | `export const routes` | Relaciona URL con componentes. |
| ¿Qué hace el frontend de cliente? | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async crear()` | Controla estado, formularios y eventos del cliente. |
| ¿Dónde está el HTML del cliente? | [cliente.component.html](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.html) | `Publicar` | Presenta los formularios y botones. |
| ¿Dónde está el registro/login? | [auth.component.ts](./codigo/arregla-ya/frontend/src/app/pages/auth.component.ts) | `async enviar()` | Lee campos, valida y llama al servicio de autenticación. |
| ¿Cómo viaja la petición a NestJS? | [core/api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) | `crearSolicitud(` | Centraliza llamadas HTTP. |
| ¿Dónde se envía el token? | [core/api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) | `authInterceptor` | Añade `Authorization: Bearer ...` a las peticiones. |
| ¿Cómo funciona el proxy? | [proxy.conf.json](./codigo/arregla-ya/frontend/proxy.conf.json) | `pathRewrite` | Redirige `/api/...` al backend en el puerto 3000, quitando `/api`. |
| ¿Dónde llega la petición de publicar? | [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) | `async publicar(` | Recibe y valida los datos; verifica que sea cliente. |
| ¿Dónde están las reglas del trabajo? | [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) | `crearTrabajoAbierto` | Procesa la operación de negocio. |
| ¿Dónde se guarda el trabajo? | [trabajo.repository.ts](./backend-prisma/src/modules/trabajo/trabajo.repository.ts) | `create` | Persiste / consulta los datos mediante el acceso ORM. |
| ¿Dónde inicia sesión NestJS? | [auth.controller.ts](./backend-prisma/src/auth/auth.controller.ts) | `async login(` | Verifica credenciales y devuelve sesión/usuario. |
| ¿Cómo validan la sesión? | [sesion.service.ts](./backend-prisma/src/auth/sesion.service.ts) | `verificar(` | Valida firma HMAC y vencimiento; **no es JWT estándar**. |
| ¿Cómo registran un trabajador? | [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | `async guardarPerfil()` | Gestiona perfil y disponibilidad. |
| ¿Quién aprueba al trabajador? | [administrador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/administrador.component.ts) | `async aprobar(` | Botón y petición desde el panel del administrador. |
| ¿Qué endpoint aprueba? | [admin-compat.controller.ts](./backend-prisma/src/modules/usuario/admin-compat.controller.ts) | `@Patch(':id/aprobar')` | Comprueba sesión y delega la decisión al servicio. |
| ¿Dónde se envía una oferta? | [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | `async enviar(` | Recoge la propuesta económica. |
| ¿Qué endpoint recibe la propuesta? | [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) | `@Post('solicitud/:id')` | Valida datos y llama al servicio de propuestas. |
| ¿Dónde acepta el cliente? | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async aceptar(` | Acepta una propuesta desde la pantalla. |
| ¿Cómo llega la aceptación al backend? | [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) | `@Patch(':id/aceptar')` | Llama a la regla de aceptación. |
| ¿Dónde se define Prisma? | [contract.prisma](./backend-prisma/src/prisma/contract.prisma) | `model` | Describe entidades y relaciones que consume Prisma. |
| ¿Dónde se conecta Prisma al código? | [db.ts](./backend-prisma/src/prisma/db.ts) / [prisma.service.ts](./backend-prisma/src/prisma/prisma.service.ts) | `db` | Expone el cliente de datos usado por el backend. |
| ¿Dónde inicia el servidor? | [main.ts](./backend-prisma/src/main.ts) | `bootstrap` | Punto de arranque de NestJS. |
| ¿Dónde se registran módulos? | [app.module.ts](./backend-prisma/src/app.module.ts) | `imports:` | Ensambla módulos por funcionalidad. |

---

## 1. EL RECORRIDO QUE TODOS DEBEN PODER EXPLICAR

```text
Usuario hace clic en Angular (4200)
     ↓
Componente TS (por ejemplo cliente.component.ts)
     ↓
ApiService en core/api.ts → HTTP /api/solicitudes
     ↓
proxy.conf.json reenvía a http://127.0.0.1:3000/solicitudes
     ↓
NestJS: Controller → Service → Repository
     ↓
Prisma → PostgreSQL (contenedor Docker, puerto 5433 reenviado)
     ↓
Respuesta JSON → ApiService → Component → HTML
```

**Frase para memorizar:** «Angular controla la interfaz, NestJS aplica la lógica y valida permisos, Prisma comunica las operaciones con PostgreSQL, y la respuesta vuelve en JSON». Angular **no** se conecta directamente a la base de datos.

### Los archivos a enseñar durante este recorrido

1. [cliente.component.html](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.html): señalar el formulario o botón de publicar.
2. [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts): localizar `async crear()` (**aprox. línea 264** en el material de integración).
3. [core/api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts): localizar `crearSolicitud(` (**aprox. línea 456**) y `const API_URL = '/api';`.
4. [proxy.conf.json](./codigo/arregla-ya/frontend/proxy.conf.json): mostrar `target` y `pathRewrite`.
5. [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts): `@Controller('solicitudes')` y `@Post()` → `publicar`.
6. [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts): `crearTrabajoAbierto`.
7. [trabajo.repository.ts](./backend-prisma/src/modules/trabajo/trabajo.repository.ts): operaciones de persistencia.
8. PostgreSQL: `SELECT * FROM trabajo;` para verificar registros.

**No memorices números de línea:** cambian con cada edición. El nombre de la función es tu marcador confiable.

---

## 2. GUÍA DE ARCHIVOS DEL FRONTEND

**Carpeta principal:** `codigo/arregla-ya/frontend/src/app/`

| Archivo | Contenido | Qué mostrar |
|---|---|---|
| [app.component.ts](./codigo/arregla-ya/frontend/src/app/app.component.ts) | Encabezado, navegación, `router-outlet`, cierre de sesión. | `routerLink`, `router-outlet`, `salir()`. |
| [app.routes.ts](./codigo/arregla-ya/frontend/src/app/app.routes.ts) | Rutas `/`, `/registro`, `/ingresar`, `/cliente`, `/trabajador`, `/administrador`. | `routes`. |
| [inicio.component.ts](./codigo/arregla-ya/frontend/src/app/pages/inicio.component.ts) | Lógica de la página de inicio. | `@Component`. |
| [inicio.component.html](./codigo/arregla-ya/frontend/src/app/pages/inicio.component.html) | Página inicial visible. | Texto y enlaces de entrada. |
| [auth.component.ts](./codigo/arregla-ya/frontend/src/app/pages/auth.component.ts) | Registro/login de usuarios. | `enviar()`. |
| [auth.component.html](./codigo/arregla-ya/frontend/src/app/pages/auth.component.html) | Formulario de autenticación. | Campos y validaciones visuales. |
| [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | Estado, búsquedas, publicaciones y propuestas del cliente. | `buscar`, `crear`, `abrirMias`, `verPropuestas`, `aceptar`. |
| [cliente.component.html](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.html) | HTML de los paneles del cliente. | Botones y condicionales `@if`. |
| [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | Perfil, solicitudes disponibles y postulación. **Incluye HTML dentro del TypeScript** (*template inline*). | `guardarPerfil`, `cargarSolicitudes`, `enviar`. |
| [administrador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/administrador.component.ts) | Lista de pendientes y botón para aprobar. También contiene *template inline*. | `cargar`, `aprobar`. |
| [core/api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) | `AuthService`, `ApiService`, interceptor de token y errores HTTP. | `authInterceptor`, `registro`, `login`, `crearSolicitud`. |
| [core/models.ts](./codigo/arregla-ya/frontend/src/app/core/models.ts) | Interfaces y tipos: usuario, trabajador, solicitud, propuesta, etc. | `interface`, `type`. |
| [styles.css](./codigo/arregla-ya/frontend/src/styles.css) | CSS global, estilos y variables de diseño. | Selectores y variables visuales. |
| [proxy.conf.json](./codigo/arregla-ya/frontend/proxy.conf.json) | Proxy de desarrollo. | `/api/**`, `target`, `pathRewrite`. |

### Conceptos que hay que saber explicar

- **Componente:** clase de Angular que controla una parte de la interfaz (`@Component`).
- **Template:** HTML que representa el componente. Puede estar en otro `.html` o dentro de `template: \`...\`` en un archivo `.ts`.
- **Signal:** almacén reactivo de estado; por ejemplo `vista()` indica qué pestaña está activa. Se modifica con `vista.set(...)`.
- **Binding:** `{{ valor }}` muestra texto; `(click)="funcion()"` ejecuta un evento; `[class.active]="condicion"` activa CSS.
- **Servicio:** clase que agrupa funciones compartidas, como `ApiService`.
- **Interceptor:** añade automáticamente la cabecera de autorización.
- **Routing / SPA:** cambiar de vista sin hacer una navegación completa a otro sitio.

### Dónde están las funciones: búsqueda rápida

| Acción en la pantalla | Archivo | Método para buscar | Zona aproximada¹ |
|---|---|---|---|
| Registrar o ingresar | [auth.component.ts](./codigo/arregla-ya/frontend/src/app/pages/auth.component.ts) | `async enviar()` | ~48 |
| Buscar trabajadores | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async buscar()` | ~233 |
| Publicar solicitud | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async crear()` | ~264 |
| Ver mis solicitudes | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async abrirMias()` | ~476 |
| Ver las propuestas | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async verPropuestas(` | ~517 |
| Aceptar propuesta | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async aceptar(` | ~555 |
| Cancelar solicitud | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) | `async cancelar(` | ~615 |
| Guardar perfil trabajador | [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | `async guardarPerfil()` | ~197 |
| Cargar trabajos disponibles | [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | `async cargarSolicitudes()` | ~223 |
| Enviar propuesta | [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) | `async enviar(` | ~272 |
| Cargar trabajadores pendientes | [administrador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/administrador.component.ts) | `async cargar()` | ~106 |
| Aprobar trabajador | [administrador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/administrador.component.ts) | `async aprobar(` | ~118 |

¹ **Líneas aproximadas de la versión revisada:** usa `Ctrl + F`, porque pueden cambiar con commits nuevos.

---

## 3. GUÍA DE ARCHIVOS DEL BACKEND

**Carpeta principal:** `backend-prisma/src/`

**Conceptos:** `Controller` recibe HTTP; `Service` aplica reglas de negocio; `Repository` accede a los datos; `DTO` define/valida la forma de las entradas; `Module` agrupa dependencias.

| Función | Controller | Service / Repository | Qué decir |
|---|---|---|---|
| Inicio de sesión y registro | [auth.controller.ts](./backend-prisma/src/auth/auth.controller.ts) | [usuario.service.ts](./backend-prisma/src/modules/usuario/usuario.service.ts) | Autentica al usuario y devuelve token. |
| Sesiones firmadas | [sesion.service.ts](./backend-prisma/src/auth/sesion.service.ts) | [usuario.repository.ts](./backend-prisma/src/modules/usuario/usuario.repository.ts) | Comprueba identidad; token firmado HMAC, no JWT convencional. |
| Publicaciones | [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) | [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts), [trabajo.repository.ts](./backend-prisma/src/modules/trabajo/trabajo.repository.ts) | Adapta las rutas del frontend; comprueba permisos y guarda publicaciones. |
| Rutas originales de trabajo | [trabajo.controller.ts](./backend-prisma/src/modules/trabajo/trabajo.controller.ts) | [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) | Gestiona publicaciones, dashboard, documentos y feeds de trabajos. |
| Aprobación de técnicos | [admin-compat.controller.ts](./backend-prisma/src/modules/usuario/admin-compat.controller.ts) | [usuario.service.ts](./backend-prisma/src/modules/usuario/usuario.service.ts) | Recibe petición de aprobar y pasa la identidad del admin al servicio. |
| Gestión original de usuarios | [usuario.controller.ts](./backend-prisma/src/modules/usuario/usuario.controller.ts) | [usuario.repository.ts](./backend-prisma/src/modules/usuario/usuario.repository.ts) | Registro, roles, documentos y dictámenes. |
| Ofertas | [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) | [propuesta.service.ts](./backend-prisma/src/modules/propuesta/propuesta.service.ts), [propuesta.repository.ts](./backend-prisma/src/modules/propuesta/propuesta.repository.ts) | Envía, consulta y acepta propuestas. |
| Rutas originales de propuestas | [propuesta.controller.ts](./backend-prisma/src/modules/propuesta/propuesta.controller.ts) | [propuesta.service.ts](./backend-prisma/src/modules/propuesta/propuesta.service.ts) | Postular, cotizar, aceptar, rechazar y retirar. |
| Perfiles | [perfil-trabajador.controller.ts](./backend-prisma/src/modules/perfil-trabajador/perfil-trabajador.controller.ts) | [perfil-trabajador.service.ts](./backend-prisma/src/modules/perfil-trabajador/perfil-trabajador.service.ts) | Especialidades, zona y disponibilidad. |
| Servicios | [servicio.controller.ts](./backend-prisma/src/modules/servicio/servicio.controller.ts) | [servicio.service.ts](./backend-prisma/src/modules/servicio/servicio.service.ts) | Reglas para servicios derivados de contratación. |
| Visitas | [visita.controller.ts](./backend-prisma/src/modules/visita/visita.controller.ts) | [visita.service.ts](./backend-prisma/src/modules/visita/visita.service.ts) | Gestión de visitas de un servicio. |
| Pagos | [pago.controller.ts](./backend-prisma/src/modules/pago/pago.controller.ts) | [pago.service.ts](./backend-prisma/src/modules/pago/pago.service.ts) | Declaración/confirmación de pagos. |
| Calificaciones | [calificacion.controller.ts](./backend-prisma/src/modules/calificacion/calificacion.controller.ts) | [calificacion.service.ts](./backend-prisma/src/modules/calificacion/calificacion.service.ts) | Gestión de evaluaciones. |
| Reclamos | [reclamo.controller.ts](./backend-prisma/src/modules/reclamo/reclamo.controller.ts) | [reclamo.service.ts](./backend-prisma/src/modules/reclamo/reclamo.service.ts) | Creación y revisión de reclamos. |
| Configuración del ORM | [contract.prisma](./backend-prisma/src/prisma/contract.prisma) | [db.ts](./backend-prisma/src/prisma/db.ts), [prisma.service.ts](./backend-prisma/src/prisma/prisma.service.ts) | Modelo relacional y cliente de acceso a datos. |
| Arranque y composición | [main.ts](./backend-prisma/src/main.ts) | [app.module.ts](./backend-prisma/src/app.module.ts) | NestJS arranca y organiza los módulos. |

**¿Qué significa `*-compat.controller.ts`?** Son controladores *adaptadores* incorporados para que la interfaz Angular use rutas como `/solicitudes`, `/propuestas` y `/trabajadores`, mientras el backend original también conserva rutas como `/trabajo`, `/propuesta`, `/usuario`. Así se reutiliza la lógica sin reescribir toda la aplicación.

**Ejemplos exactos para señalar en el código:**

- [Publicar](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts): `@Post()` y `async publicar(...)`; valida campos, fecha y rol `cliente`.
- [Solicitudes disponibles](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts): `@Get('disponibles')`; verifica rol `reparador` y estado `aprobado`.
- [Aprobar trabajador](./backend-prisma/src/modules/usuario/admin-compat.controller.ts): `@Patch(':id/aprobar')`; delega a `dictaminarPerfilReparador`.
- [Enviar propuesta](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts): `@Post('solicitud/:id')`; valida precio y costo de visita.
- [Aceptar propuesta](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts): `@Patch(':id/aceptar')`; delega a `aceptarPropuesta`.
- [Token](./backend-prisma/src/auth/sesion.service.ts): `crear(` y `verificar(`; muestra firma y vencimiento sin mostrar secretos.

---

## 4. CINCO DEMOSTRACIONES PASO A PASO

### A. Registro e inicio de sesión

1. En la web, mostrar la pantalla **Registrarse / Ingresar**.
2. Abrir [auth.component.html](./codigo/arregla-ya/frontend/src/app/pages/auth.component.html): campos visibles.
3. Abrir [auth.component.ts](./codigo/arregla-ya/frontend/src/app/pages/auth.component.ts) → `enviar()`.
4. Abrir [core/api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) → `registro(` / `login(`.
5. Abrir [auth.controller.ts](./backend-prisma/src/auth/auth.controller.ts) → `@Post('registro')` y `@Post('login')`.
6. Abrir [sesion.service.ts](./backend-prisma/src/auth/sesion.service.ts): creación y verificación del token.
7. PostgreSQL: `SELECT id_usuario, nombre, email FROM usuario;`.

**Respuesta breve:** «El frontend envía credenciales; NestJS las valida en el servidor; el sistema devuelve un token de sesión firmado y los datos del usuario».

### B. Publicar solicitud como cliente

1. Crear trabajo desde la web (sin datos personales reales).
2. Abrir [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) → `crear()`.
3. Abrir [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) → `crearSolicitud(`.
4. Abrir [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) → `publicar(`.
5. Abrir [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) → `crearTrabajoAbierto`.
6. PostgreSQL: `SELECT * FROM trabajo LIMIT 5;`.

**Respuesta breve:** «Se validan los campos y el rol cliente, se persiste el trabajo y la interfaz muestra la nueva publicación».

### C. Aprobar trabajador desde el administrador

1. Abrir la web con una cuenta que tenga **rol administrador asignado realmente en la BD**.
2. Mostrar trabajador `pendiente` en el panel.
3. Abrir [administrador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/administrador.component.ts) → `cargar()` y `aprobar(`.
4. Abrir [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) → `pendientes()` y `aprobar(id)`.
5. Abrir [admin-compat.controller.ts](./backend-prisma/src/modules/usuario/admin-compat.controller.ts) → `@Patch(':id/aprobar')`.
6. Abrir [usuario.service.ts](./backend-prisma/src/modules/usuario/usuario.service.ts) → `dictaminarPerfilReparador`.
7. Comprobar PostgreSQL:

```sql
SELECT u.id_usuario, u.nombre, p.estado_aprobacion
FROM usuario u JOIN perfil_trabajador p ON p.id_usuario = u.id_usuario;
```

**Respuesta breve:** «Un trabajador se registra pendiente; una cuenta autorizada dicta la aprobación; el estado queda registrado en PostgreSQL».

### D. Enviar propuesta de técnico

1. Ingresar como **trabajador aprobado**.
2. Mostrar solicitudes disponibles y abrir formulario de oferta.
3. Abrir [trabajador.component.ts](./codigo/arregla-ya/frontend/src/app/pages/trabajador.component.ts) → `cargarSolicitudes()` / `enviar(`.
4. Abrir [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) → `disponibles()` / `ofrecer(`.
5. Abrir [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) → `@Post('solicitud/:id')`.
6. Abrir [propuesta.service.ts](./backend-prisma/src/modules/propuesta/propuesta.service.ts) → `postular`.
7. PostgreSQL: `SELECT * FROM propuesta LIMIT 5;`.

**Respuesta breve:** «El trabajador aprobado cotiza una solicitud; el backend verifica la información y la guarda como propuesta».

### E. Cliente acepta una propuesta

1. Volver al navegador del cliente; abrir **Mis solicitudes → Ver propuestas**.
2. Abrir [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) → `verPropuestas(` y `aceptar(`.
3. Abrir [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) → `propuestas(` / `aceptar(`.
4. Abrir [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) → `@Patch(':id/aceptar')`.
5. Abrir [propuesta.service.ts](./backend-prisma/src/modules/propuesta/propuesta.service.ts) → `aceptarPropuesta`.
6. PostgreSQL: `SELECT * FROM propuesta LIMIT 5;` y `SELECT * FROM servicio LIMIT 5;`.

**Respuesta breve:** «Solo el cliente dueño de la solicitud debe poder aceptar una propuesta; la operación actualiza la contratación en el backend». **Verificar el resultado real antes de afirmar que se creó un servicio**.

---

## 5. PREGUNTAS TÉCNICAS Y RESPUESTAS RÁPIDAS

| Pregunta | Respuesta sugerida | Archivo para demostrar |
|---|---|---|
| ¿Cuál es su arquitectura? | Cliente-servidor y capas: componente, API, controlador, servicio, repositorio y BD. | [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts), [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) |
| ¿Por qué no conectan Angular a PostgreSQL? | Expondría credenciales y saltaría reglas del servidor. Solo NestJS accede a BD. | [proxy.conf.json](./codigo/arregla-ya/frontend/proxy.conf.json), [db.ts](./backend-prisma/src/prisma/db.ts) |
| ¿Qué es un Controller? | Una clase NestJS que recibe solicitudes HTTP. | [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) |
| ¿Qué es un Service? | Clase que organiza reglas y operaciones del dominio. | [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) |
| ¿Qué es Repository? | Encapsula consultas y persistencia. | [trabajo.repository.ts](./backend-prisma/src/modules/trabajo/trabajo.repository.ts) |
| ¿Qué es DTO? | Contrato de datos de entrada. Puede incorporar validaciones. | [crear-trabajo-abierto.dto.ts](./backend-prisma/src/modules/trabajo/dto/crear-trabajo-abierto.dto.ts) |
| ¿Qué es Prisma? | ORM/capa de acceso a PostgreSQL, no una segunda base de datos. | [contract.prisma](./backend-prisma/src/prisma/contract.prisma), [db.ts](./backend-prisma/src/prisma/db.ts) |
| ¿Qué es JSON? | Representación estructurada intercambiada en HTTP. | [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) |
| ¿GET, POST y PATCH? | GET consulta; POST crea/procesa; PATCH modifica un recurso. | [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) |
| ¿Qué es un token? | Credencial temporal de sesión enviada como Bearer. | [sesion.service.ts](./backend-prisma/src/auth/sesion.service.ts) |
| ¿Es JWT? | En esta integración no: es un token propio firmado con HMAC. | [sesion.service.ts](./backend-prisma/src/auth/sesion.service.ts) |
| ¿Autenticación vs autorización? | Autenticación comprueba identidad; autorización comprueba permisos. | [auth.controller.ts](./backend-prisma/src/auth/auth.controller.ts), [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) |
| ¿Qué es una FK? | Clave foránea que enlaza registros de tablas. | [contract.prisma](./backend-prisma/src/prisma/contract.prisma) y `\d propuesta` en psql |
| ¿Qué es una transacción? | Varios cambios que deben confirmarse o revertirse como conjunto. | Buscar `transaction` / `\$transaction` en repositorios y servicios. No afirmar que todas las operaciones usan transacción. |
| ¿Qué es una Signal? | Estado reactivo que actualiza la vista. | [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts) → `vista = signal` |
| ¿Qué es inyección de dependencias? | NestJS crea y entrega servicios a otros componentes por constructor. | [propuestas-compat.controller.ts](./backend-prisma/src/modules/propuesta/propuestas-compat.controller.ts) |
| ¿Qué SOLID se observa? | Responsabilidad única y separación de dependencias entre Controller, Service y Repository. | [trabajo.controller.ts](./backend-prisma/src/modules/trabajo/trabajo.controller.ts), [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) |
| ¿Qué es alta cohesión? | Métodos de una clase colaboran en una misma tarea. | [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts) |
| ¿Qué es bajo acoplamiento? | Cambios internos de una capa afectan lo menos posible a otras. | [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts) |
| ¿Qué hace Docker? | Ejecuta PostgreSQL en un contenedor aislado. | Terminal: `docker ps` |
| ¿Por qué hay tres puertos? | 4200 Angular, 3000 NestJS, 5433 PostgreSQL reenviado al entorno. | Panel **Puertos** de Codespaces |

---

## 6. POSTGRESQL: DEMOSTRACIÓN EN TERMINAL

**OJO:** estas órdenes `docker ...` van en la **terminal Linux normal**; lo que sigue después de entrar en `psql` es SQL o un comando propio de `psql`.

```bash
# Ver contenedores
 docker ps

# Encender la base si se detuvo
 docker start arreglaya-postgres-joel

# Entrar a PostgreSQL
 docker exec -it arreglaya-postgres-joel psql -U joel -d arreglaya_pruebas
```

**Ya dentro de `arreglaya_pruebas=#`:**

```sql
\pset pager off
\dt
\d usuario
\d trabajo
\d propuesta
SELECT id_usuario, nombre, email FROM usuario;
SELECT id_usuario, experiencia_anios, estado_aprobacion FROM perfil_trabajador;
SELECT * FROM trabajo LIMIT 5;
SELECT * FROM propuesta LIMIT 5;
SELECT * FROM servicio LIMIT 5;
SELECT COUNT(*) FROM usuario;
\q
```

Si aparece `(END)`, presiona **Q** para salir del paginador. `\q` sale de `psql`. Evita `SELECT * FROM usuario` en una transmisión de pantalla si la tabla contiene hashes u otros datos sensibles; elige columnas concretas.

---

## 7. CÓMO CAMBIAR DE ARCHIVO SIN PERDER TIEMPO

| Atajo de VS Code / Codespaces | Acción |
|---|---|
| **Ctrl + P** | Buscar y abrir cualquier archivo por nombre. |
| **Ctrl + F** | Buscar nombre de función dentro del archivo. |
| **Ctrl + G** | Saltar a una línea (si conoces el número). |
| **Ctrl + Shift + F** | Buscar un método en todos los archivos. |
| **Ctrl + Shift + V** | Vista previa de este Markdown, con enlaces. |
| **Ctrl + B** | Mostrar/ocultar explorador de archivos. |
| **Ctrl + `** | Mostrar/ocultar terminal. |
| **Ctrl + \** | Dividir el editor para mostrar dos archivos a la vez. |

**Montaje recomendado antes de defender:**

1. En un editor deja abierta esta guía en **vista previa**.
2. En otro editor abre [cliente.component.ts](./codigo/arregla-ya/frontend/src/app/pages/cliente.component.ts).
3. Deja abiertas como pestañas [api.ts](./codigo/arregla-ya/frontend/src/app/core/api.ts), [solicitudes-compat.controller.ts](./backend-prisma/src/modules/trabajo/solicitudes-compat.controller.ts) y [trabajo.service.ts](./backend-prisma/src/modules/trabajo/trabajo.service.ts).
4. Mantén la app de Angular en otra pestaña del navegador y la terminal de PostgreSQL preparada.
5. Al responder una pregunta, haz clic en el enlace de esta guía; en el archivo abierto usa `Ctrl + F` para localizar el método.

**Si se pregunta algo más complejo:** usa `Ctrl + Shift + F` y busca `aceptarPropuesta`, `dictaminarPerfilReparador`, `crearTrabajoAbierto`, `scrypt`, `ForbiddenException` o `\$transaction`.

---

## 8. DEMO DE 3 MINUTOS: TEXTO PARA DECIR

**0:00–0:30 · Pantalla:** «Esta es ARREGLA YA. Un cliente publica una necesidad y un técnico especializado puede presentar una propuesta. Tenemos las vistas de cliente, trabajador y administrador».

**0:30–1:00 · Frontend:** «Angular está dividido en componentes. El HTML muestra los formularios, el TypeScript ejecuta las acciones y `ApiService` centraliza las llamadas al servidor».

**1:00–1:45 · Conexión:** «Las peticiones usan HTTP y JSON. El proxy de desarrollo lleva `/api/...` a NestJS. El controlador recibe y valida la petición, un servicio aplica la regla de negocio y un repositorio usa Prisma para acceder a PostgreSQL».

**1:45–2:20 · BD:** «Aquí se ven las tablas relacionadas. Por ejemplo, `usuario` contiene las cuentas, `perfil_trabajador` mantiene el estado de aprobación, `trabajo` guarda las solicitudes y `propuesta` almacena las ofertas».

**2:20–3:00 · Seguridad y cierre:** «La identidad se valida con una sesión firmada. Además hay controles de rol, como permitir que solo un cliente publique o que un técnico aprobado consulte trabajos disponibles. Para defender que una función está completa, la verificamos también en PostgreSQL».

---

## 9. ESTADO DE LA DEMOSTRACIÓN: SER PRECISOS

**Comprobado en las pruebas compartidas:**

- Angular, NestJS y PostgreSQL levantaron sus puertos de Codespaces.
- Se pudo registrar un cliente y crear la solicitud de prueba número 1.
- Se registró un trabajador de prueba; en PostgreSQL el usuario apareció con `estado_aprobacion = pendiente`.
- La base de datos contiene **21 tablas** según `\dt`.

**Todavía por verificar en una secuencia completa antes de la defensa:** aprobación administrativa, aparición del trabajador aprobado en búsquedas, postulación, aceptación, servicio, visita, pagos, calificación y reclamos. Que exista un controlador o una tabla **no demuestra** que el circuito completo de la interfaz ya funcione.

**Cuidado con las pantallas de seguimiento:** en el frontend revisado hay apartados llamados `prepararVisita`, `prepararAumento`, `simularDecision`, `prepararPago`, `prepararValoracion` y `prepararReclamo`. Algunos son borradores o simulaciones de interfaz; no presentarlos como persistencia real sin comprobar las peticiones de red y las tablas.

**No mostrar:** contraseñas, contenido de `.env`, `SESSION_SECRET`, cadenas de conexión, hashes de contraseña, documentos reales de identidad ni tokens completos.

---

## 10. CÓMO INICIAR TODO SI EL DOCENTE PIDE MOSTRAR EL ENTORNO

Terminal 1 (base de datos):

```bash
docker start arreglaya-postgres-joel
docker ps
```

Terminal 2 (NestJS):

```bash
cd /workspaces/arregla-ya-backend-prisma/backend-prisma
npm run start:dev
```

Terminal 3 (Angular):

```bash
cd /workspaces/arregla-ya-backend-prisma/codigo/arregla-ya/frontend
npm start -- --proxy-config proxy.conf.json
```

**Puertos:** Angular `4200`, NestJS `3000`, PostgreSQL `5433` reenviado. Compartir únicamente el puerto `4200` cuando sea necesario y esté asegurado; nunca publicar el de la base de datos.

---

## 11. UN MINUTO DE REPASO: TÉRMINOS QUE MÁS PREGUNTAN

- **Frontend:** interfaz de usuario: Angular, HTML, CSS, TypeScript.
- **Backend:** lógica y API: NestJS ejecutándose sobre Node.js.
- **ORM:** capa para acceder a datos desde código: Prisma.
- **DBMS:** sistema gestor de base de datos: PostgreSQL.
- **API REST:** recursos y operaciones mediante HTTP (`GET`, `POST`, `PATCH`...).
- **Endpoint:** dirección de una operación, por ejemplo `/solicitudes`.
- **JSON:** formato de los datos transmitidos.
- **DTO:** estructura de entrada; ayuda a validar datos.
- **Controller:** recibe peticiones y entrega respuestas.
- **Service:** aplica reglas de negocio.
- **Repository:** encapsula las consultas/persistencia.
- **Inyección de dependencias:** NestJS proporciona instancias a otras clases.
- **Autenticación:** «¿quién eres?»; **autorización:** «¿qué te permiten hacer?».
- **Hash:** forma no reversible de conservar/verificar contraseñas.
- **PK:** identificador único de tabla; **FK:** relación con otra tabla.
- **Transacción:** cambios agrupados que se confirman o revierten juntos.
- **SOLID:** principios para diseñar clases fáciles de mantener.
- **Cohesión alta:** métodos centrados en una tarea.
- **Acoplamiento bajo:** pocas dependencias innecesarias.

**Última frase para memorizar:** «Puedo mostrar una acción desde el botón de Angular, seguirla por `ApiService` y un controlador de NestJS, localizar su regla en el servicio y confirmar el resultado en PostgreSQL».

---

*Guía de navegación creada para la rama de pruebas. Mantener en la raíz del proyecto para que funcionen sus enlaces relativos.*
