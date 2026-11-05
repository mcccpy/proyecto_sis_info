# ARREGLA YA · Base compartida del equipo

> **Prototipo académico inicial (MVP)** basado en la licitación. No es una aplicación lista para producción. El código fuente es editable y fue preparado para **Angular 22 + NestJS 12 + PostgreSQL 17 + TypeORM**.

## Qué pueden mostrar al docente

1. Página de inicio de ARREGLA YA con categorías y diseño adaptable.
2. Registro de **cliente, empresa y trabajador**; inicio de sesión con contraseña hasheada.
3. Trabajador registra experiencia, especialidad, zona y horarios. Inicialmente **no está aprobado**.
4. Administrador aprueba al trabajador desde su panel.
5. Clientes consultan técnicos aprobados; publican solicitudes con título, descripción, ubicación privada, zona, horario y categoría.
6. Técnicos aprobados consultan solicitudes **sin direcciones exactas** y presentan cotizaciones con precio, visita y materiales.
7. El cliente consulta las cotizaciones y acepta una. Los datos quedan en PostgreSQL.

Se incluye `preview/index.html`, una **maqueta interactiva sin backend** para mostrar el diseño incluso antes de instalar las dependencias. **La maqueta NO guarda en PostgreSQL**.

## 1) Instalaciones (Windows)

- **Node.js 22.22.3 o superior de la serie 22**, o **Node.js 24.15+**. Versiones anteriores como 22.16 NO cumplen Angular 22.
- Visual Studio Code, Git, y Docker Desktop (preferido) **o** PostgreSQL 17 instalado localmente.
- No es necesario instalar Angular CLI ni Nest CLI globalmente: el proyecto incluye sus herramientas como dependencias locales y se inicia con `npm`.

Comprueben en PowerShell:

```powershell
node -v
npm -v
git --version
```

## 2) Primer arranque paso a paso

**Descarguen un mismo ZIP**, extráiganlo y compartan un mismo repositorio GitHub. Ejecuten los siguientes comandos en terminales distintas desde la raíz `ARREGLA_YA_Starter`.

### Terminal A: PostgreSQL

Si utilizan Docker Desktop, ábranlo y después:

```powershell
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con datos persistentes en volumen Docker. **Solo se expone a la propia computadora.** La contraseña del compose es para desarrollo local, cámbienla si van a trabajar en una red compartida.

Si no tienen Docker, Mateo puede crear manualmente usuario y base de datos usando pgAdmin y los mismos valores de `backend/.env` (ver `database/SETUP_SIN_DOCKER.md`).

### Terminal B: Backend NestJS

```powershell
cd backend
Copy-Item .env.example .env
```

**Edita `backend/.env` y reemplaza `JWT_SECRET` por una clave secreta aleatoria de al menos 32 caracteres.** Revisa también las credenciales de PostgreSQL.

```powershell
npm install
npm run start:dev
```

Prueba en navegador: http://localhost:3000/api/health → debe mostrar `"ok": true`.

**No ejecutes el backend antes de iniciar PostgreSQL.** `synchronize: true` crea automáticamente tablas en la BD *solo para desarrollo*, y debe sustituirse por migraciones antes de entregar un despliegue final.

### Terminal C: Frontend Angular

```powershell
cd frontend
npm install
npm start
```

Abre http://localhost:4200/ y verifica la pantalla de ARREGLA YA.

> Si estás en PowerShell dentro de la carpeta raíz, cada uno de los `cd` se hace desde la carpeta raíz y en **terminales separadas**. Si ya cambiaste al directorio `backend`, vuelve primero con `cd ..`.

### Cuenta del administrador de demostración

No se habilita **registro público de administradores**. Para crear el primer administrador, después de configurar el `.env` y levantar Postgres, en una terminal nueva:

```powershell
cd backend
```

Modifica en `.env` `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` por valores propios (contraseña de 10 o más caracteres y que NO empiece por `CAMBIAR`). Luego:

```powershell
npm run seed:admin
```

Ingresa con esos datos en `/ingresar` y abre `/administrador`.

## 3) Recorrido de demostración real

1. **Crear cuenta de TRABAJADOR** desde `http://localhost:4200/registro`.
2. Entrar en `Técnicos → Mi perfil`, completar su especialidad, experiencia, zona y horario. Guardar.
3. Cerrar sesión; entrar con el **administrador creado por seed**. Ir a `Administración`, aprobar al trabajador. No es certificación profesional.
4. Cerrar sesión; registrar cuenta **CLIENTE**. Ir a `Clientes → Publicar solicitud` y completar todos los campos. El enlace de fotografía es **opcional** (la subida de archivos todavía no está implementada).
5. Cerrar sesión; entrar con cuenta de **TRABAJADOR aprobado**. Ir a `Solicitudes disponibles` → enviar una cotización.
6. Cerrar sesión; entrar con el **CLIENTE**. Ir a `Mis solicitudes` → `Ver propuestas` → `Aceptar`.
7. Revisar las tablas y relaciones en pgAdmin. Si se reinicia el backend, los datos permanecen en el volumen de PostgreSQL.

**Regla de límite temporal:** para este MVP se considera “abierta” cualquier solicitud que no sea `CANCELADA` ni `FINALIZADA`, con límites de 3 particulares y 10 empresas. Este criterio **no quedó definido en la licitación**, por lo tanto debe validarse con el docente antes de implementarse definitivamente.

**Estado de publicación temporal:** el MVP crea una solicitud `ACTIVA` para poder demostrar cotizaciones. El flujo detallado `EN_REVISION` / `SUSPENDIDA` es trabajo pendiente del administrador.

## 4) Cómo trabajar los cinco sobre un solo proyecto

- **Joel** — `frontend/src/app/pages/cliente.component.ts`, y componentes de clientes que extraiga de ese módulo.
- **Ian** — `frontend/src/app/pages/trabajador.component.ts`, `administrador.component.ts` y componentes relacionados.
- **Fernando** — `backend/src/auth/`, `backend/src/trabajadores/`, seguridad y aprobación.
- **Mauritzio** — `backend/src/solicitudes/` y `backend/src/propuestas/`; después visitas, pagos y seguimiento.
- **Mateo** — `backend/src/entities.ts`, PostgreSQL, migraciones y datos de prueba, junto con Fernando y Mauritzio.

**Archivos compartidos y sujetos a revisión en equipo:** `frontend/src/app/core/api.ts`, `frontend/src/app/core/models.ts`, `backend/src/entities.ts`, `backend/src/app.module.ts`.

Usen **un repositorio privado**, una rama por persona (`feature/joel-clientes`, `feature/ian-trabajadores`, etc.), Pull Requests y pruebas antes de fusionar en `main`. Nunca suban `.env`, contraseñas, archivos privados o capturas sensibles.

## 5) Lo que NO está implementado todavía

Consultar `docs/ALCANCE_Y_PENDIENTES.md`. En particular faltan: carga real de fotografías, visitas sin conflictos, incrementos de presupuesto, pagos efectivo/QR y doble confirmación, finalización, calificaciones, reclamos, zonas avanzadas y auditoría completa. No se debe presentar este MVP como si ya cubriera todos los RF-01…RF-16.

## 6) Pruebas y revisión de seguridad

- Backend: `npm run typecheck` y `npm run build`.
- Frontend: `npm run typecheck` y `npm run build`.
- API: ejecutar la secuencia de `docs/PRUEBAS_MANUALES.md`.

**Advertencias**: JWT en `localStorage` es una simplificación del prototipo; para publicación real se requieren cookies HttpOnly/CSRF, rate limiting, HTTPS, validaciones adicionales y revisión de seguridad. `synchronize:true` y las claves de desarrollo son solo locales. No es un servicio de verificación profesional ni de cobros bancarios.

## Referencias de instalación

- Angular: https://angular.dev/installation
- Angular y Node compatibles: https://angular.dev/reference/versions
- NestJS: https://docs.nestjs.com/first-steps
- TypeORM: https://typeorm.io/
- PostgreSQL: https://www.postgresql.org/docs/
