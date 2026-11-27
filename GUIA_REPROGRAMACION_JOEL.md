# ARREGLA YA - Defensa individual de Joel Torrico

**Enunciado 11:** reprogramación de visitas técnicas. Los dos participantes (cliente y trabajador) pueden solicitar nuevas fechas; solo la otra persona puede aceptarlas o rechazarlas. El sistema detecta conflictos de horarios y guarda historial en PostgreSQL.

## Archivos nuevos

- `backend-prisma/migrations/manual/20261127_reprogramacion_visita.sql`: crea una tabla real e índices. Una sola solicitud **pendiente** por visita.
- `backend-prisma/src/modules/reprogramacion-visita/reprogramacion.controller.ts`: define las rutas HTTP.
- `backend-prisma/src/modules/reprogramacion-visita/reprogramacion.service.ts`: comprueba fechas, motivo y llama al repositorio.
- `backend-prisma/src/modules/reprogramacion-visita/reprogramacion.repository.ts`: consultas SQL parametrizadas y transacciones.
- `backend-prisma/src/modules/reprogramacion-visita/dto/`: campos y validaciones de las peticiones.
- `codigo/arregla-ya/frontend/src/app/core/visitas-joel-api.service.ts`: conecta Angular con las rutas HTTP.
- `codigo/arregla-ya/frontend/src/app/pages/visitas-joel.component.ts`: lógica de formularios, mensajes y estado Angular.
- `codigo/arregla-ya/frontend/src/app/pages/visitas-joel.component.html`: pantalla visible.

**Archivos existentes que se amplían:** `backend-prisma/src/app.module.ts`, `codigo/arregla-ya/frontend/src/app/app.routes.ts` y `codigo/arregla-ya/frontend/src/app/app.component.ts`.

## Instalar en el Codespace (rama joel-torrico)

1. Asegúrate de estar en la rama personal, sin trabajo versionado pendiente:

   ```bash
   cd /workspaces/arregla-ya-backend-prisma
   git switch joel-torrico
   git status --short
   ```

2. Descarga el archivo `ARREGLA_YA_Joel_Reprogramacion.zip` desde la conversación y súbelo **a la raíz del proyecto** desde el explorador de archivos de Codespaces. Extráelo:

   ```bash
   cd /workspaces/arregla-ya-backend-prisma
   unzip -o ARREGLA_YA_Joel_Reprogramacion.zip -d .
   rm ARREGLA_YA_Joel_Reprogramacion.zip
   ```

**Forma rapida:** despues de descomprimir, ejecuta `bash INSTALAR_JOEL.sh`. El instalador realiza los pasos 3 al 6, sin hacer commit ni push. Los pasos manuales siguen disponibles para que puedas explicarlos.

3. Instala `pg` y sus tipos en el backend (usa la misma `DATABASE_URL` del backend Prisma):

   ```bash
   cd backend-prisma
   npm install pg
   npm install -D @types/pg
   ```

4. Inicia PostgreSQL e instala la tabla:

   ```bash
   cd /workspaces/arregla-ya-backend-prisma
   docker start arreglaya-postgres-joel
   docker exec -i arreglaya-postgres-joel \
     psql -v ON_ERROR_STOP=1 -U joel -d arreglaya_pruebas \
     < backend-prisma/migrations/manual/20261127_reprogramacion_visita.sql
   ```

   **No se importa la base de datos del proyecto desde cero**: esta migración solo agrega el historial a la base existente.

5. Compila el backend:

   ```bash
   cd backend-prisma
   npm run build
   ```

6. Compila el frontend:

   ```bash
   cd ../codigo/arregla-ya/frontend
   npm run build
   ```

7. Inicia el backend y frontend en terminales separadas:

   **Terminal A:**
   ```bash
   cd /workspaces/arregla-ya-backend-prisma/backend-prisma
   npm run start:dev
   ```

   **Terminal B:**
   ```bash
   cd /workspaces/arregla-ya-backend-prisma/codigo/arregla-ya/frontend
   npm start -- --proxy-config proxy.conf.json
   ```

8. Abre la aplicación Angular, inicia sesión como cliente o trabajador y pulsa **Visitas** en la barra superior.

## Prueba completa para la defensa

**Requisito:** el sistema debe tener una solicitud cuya propuesta ya fue aceptada; eso crea un `servicio` activo. Si no hay servicios, primero crea la solicitud en Cliente, presenta propuesta desde Trabajador y acéptala desde Cliente.

1. Con el cliente, abre **Visitas**. Elige el servicio activo y programa una primera visita para mañana, por ejemplo 10:00–11:00.
2. Pulsa **Ver historial y reprogramar** y solicita cambiarla a mañana 15:00–16:00. Escribe el motivo.
3. Observa que la visita **sigue** a las 10:00–11:00 mientras la solicitud está pendiente.
4. Cierra sesión y entra con el trabajador asignado. Abre Visitas, actualiza, abre el historial y pulsa **Aceptar horario**.
5. La visita aparece a las 15:00–16:00 y el historial indica **aprobada**.
6. Prueba otra solicitud y pulsa **Rechazar**: el horario queda intacto y el historial muestra **rechazada**.
7. Programa otra visita para el mismo trabajador de mañana 17:00–18:00. Intenta reprogramar la primera a 17:30–18:30: debe aparecer un error de conflicto.
8. Como prueba de seguridad: intenta aprobar tu propia solicitud. La interfaz no muestra el botón; el backend también lo rechaza (HTTP 403).
9. Si hay una solicitud pendiente, intenta solicitar otra sobre la misma visita: se rechaza.
10. Recarga la página: las solicitudes y horarios siguen presentes porque están en PostgreSQL.

## Cómo explicar el código en el video

- **Frontend Angular:** el HTML tiene formularios, botones e historial; el `.ts` recibe los datos mediante el `VisitasJoelApiService`, cambia las `signal` y muestra los nuevos resultados.
- **HTTP:** Angular envía `GET` para consultar, `POST` para crear y `PATCH` para responder. El interceptor ya existente agrega el token de la sesión.
- **Controller:** recibe la petición, valida que haya sesión mediante `SesionService` y entrega al Service los datos.
- **DTO:** comprueba tipos básicos, fechas ISO y decisiones válidas.
- **Service:** verifica que las fechas sean válidas y futuras, que el final sea posterior al inicio, y que el motivo tenga longitud suficiente.
- **Repository:** trabaja con PostgreSQL mediante `pg` y SQL parametrizado. No reemplaza el resto del backend, que continúa usando Prisma. Usar SQL explícito permite ver en la defensa las consultas y transacciones sobre la tabla nueva.
- **Seguridad:** el usuario se obtiene del token firmado, no de un ID escrito en el formulario. Solo cliente y trabajador asignado participan. El solicitante no puede aprobarse a sí mismo.
- **Transacción:** `BEGIN` inicia una operación, `COMMIT` guarda tanto la visita como el historial, y `ROLLBACK` cancela ambos cambios ante un error.
- **Conflicto de horarios:** dos intervalos se superponen si `inicio_existente < fin_nuevo` y `fin_existente > inicio_nuevo`. Se excluye la visita modificada. Un bloqueo de fila `FOR UPDATE` sobre el perfil del trabajador evita carreras con otra programación simultánea.
- **Historial:** la tabla `reprogramacion_visita` conserva fecha anterior, nueva, motivo, solicitante, revisor, estado y fecha de respuesta.

## Rutas implementadas

| Método | Ruta | Uso |
|---|---|---|
| GET | `/reprogramaciones-visita/servicios` | Servicios activos del usuario |
| GET | `/reprogramaciones-visita/visitas` | Sus visitas reales |
| GET | `/reprogramaciones-visita/visitas/:id/historial` | Historial autorizado |
| POST | `/reprogramaciones-visita/visitas` | Primera visita |
| POST | `/reprogramaciones-visita/visitas/:id/solicitudes` | Solicitar un cambio |
| PATCH | `/reprogramaciones-visita/solicitudes/:id/responder` | Aprobar o rechazar |

El frontend usa `/api` con el proxy de Angular; el controlador NestJS no usa ese prefijo.

## Guardar en la rama personal y actualizar el PR #5

Solo después de compilar y probar:

```bash
cd /workspaces/arregla-ya-backend-prisma

git add backend-prisma/src/app.module.ts \
  backend-prisma/src/modules/reprogramacion-visita \
  backend-prisma/migrations/manual/20261127_reprogramacion_visita.sql \
  backend-prisma/package.json backend-prisma/package-lock.json \
  codigo/arregla-ya/frontend/src/app/app.component.ts \
  codigo/arregla-ya/frontend/src/app/app.routes.ts \
  codigo/arregla-ya/frontend/src/app/core/visitas-joel-api.service.ts \
  codigo/arregla-ya/frontend/src/app/pages/visitas-joel.component.ts \
  codigo/arregla-ya/frontend/src/app/pages/visitas-joel.component.html \
  GUIA_REPROGRAMACION_JOEL.md

git diff --cached --stat
git commit -m "feat: reprogramar visitas con validaciones e historial"
git push origin joel-torrico
```

**No uses `git add .`** porque tienes respaldos, ZIP y kits sin seguimiento. **No hagas merge** del Pull Request.

## Descripcion de PR sugerida

**Joel Torrico Gevara — Grupo 3, Escuadrón Cochino. Enunciado 11.**

Implementé reprogramación de visitas técnicas con solicitudes pendientes, aprobación o rechazo por la otra persona, control de choques de horarios del trabajador, validaciones de datos y permisos, e historial persistente en PostgreSQL. Agregué un módulo NestJS con rutas autenticadas, DTO, Service, Repository y transacciones; además, una página Angular con formularios y consulta de historial. Incluí una migración SQL para la tabla de reprogramaciones. El PR se mantiene abierto para revisión del docente, sin merge.
