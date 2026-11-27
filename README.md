# ARREGLA YA

Proyecto académico de Ingeniería de Sistemas.

ARREGLA YA es una aplicación web que conecta
clientes con trabajadores especializados en
servicios de reparación.

## Tecnologías utilizadas

- Frontend: Angular y TypeScript
- Backend: NestJS y Node.js
- ORM: Prisma
- Base de datos: PostgreSQL
- Entorno de desarrollo: GitHub Codespaces
- Contenedores: Docker

## Estructura del proyecto

backend-prisma/
  Backend principal de NestJS.
  Contiene controladores, servicios, repositorios,
  autenticación, Prisma y esquema SQL.

codigo/arregla-ya/frontend/
  Frontend Angular.
  Contiene las interfaces de clientes,
  trabajadores y administradores.

documentos_etc/
  Documentación y requisitos académicos.

GUIA_DEFENSA.md
  Guía técnica para explicar el proyecto.

## Arquitectura

Usuario
   |
   v
Angular (Frontend)
   |
   v
API HTTP
   |
   v
NestJS (Backend)
   |
   v
Services y Repositories
   |
   v
Prisma
   |
   v
PostgreSQL

## Funcionamiento principal

1. El cliente se registra.
2. Publica una solicitud de reparación.
3. El trabajador registra su perfil.
4. Un administrador aprueba al trabajador.
5. El trabajador envía una propuesta.
6. El cliente acepta una propuesta.
7. El sistema registra el servicio.

## Ejecución en el Codespace configurado

Primero iniciar PostgreSQL:

docker start arreglaya-postgres-joel

Iniciar el backend:

cd backend-prisma
npm run start:dev

Iniciar el frontend desde la raíz:

cd codigo/arregla-ya/frontend
npm start -- --proxy-config proxy.conf.json

Abrir el puerto 4200.

## Base de datos

PostgreSQL utiliza las tablas del proyecto.
El esquema inicial se encuentra en:

backend-prisma/Arreglalo_ya_compatible_Prisma_v2.sql

La conexión se configura mediante variables
de entorno privadas.

La base de datos de pruebas utilizada durante
la defensa está en un volumen Docker local.
Para ejecutar el proyecto en otro entorno
deben configurarse PostgreSQL y las variables
de entorno correspondientes.

## Organización del trabajo

El proyecto se desarrolla mediante Git y GitHub.

Cada integrante trabaja en su rama individual.

Los cambios se presentan mediante Pull Requests
para revisión antes de incorporarlos a main.

## Estado del proyecto

Versión académica en desarrollo, entregada
para revisión y observaciones del docente.
