-- ARREGLA YA - ESQUEMA PARA PRUEBAS (Prisma 8)
-- Referencia: contract.prisma proporcionado por el usuario, 26/11/2026.
-- Basado en Arreglalo_ya.sql; no contiene datos de usuarios.
-- Ejecutar solo en una BASE DE DATOS VACIA destinada a pruebas.
-- No ejecutar sobre la base real del equipo ni sobre una base ya poblada.
-- Se ajustaron relaciones (visita, reclamo, evento_trabajo),ls -lh diagnostico_*.tar.gz
-- campos de incremento_presupuesto y valores ENUM de estado_pago.
-- IMPORTANTE: esto no crea triggers, funciones ni semillas de datos del backend.
-- La validacion final requiere ejecutarlo en PostgreSQL y probar el backend.

BEGIN;

-- =====================================================================
-- ARREGLA YA - SQL AJUSTADO AL CONTRATO PRISMA (VERSION DE PRUEBA)
-- Fuente: Arreglalo_ya.sql enviado por el usuario.
-- Cambios verificados contra extractos de src/prisma/contract.prisma:
--   1. visita.id_servicio -> servicio.id_servicio (antes id_propuesta)
--   2. reclamo.id_servicio -> servicio.id_servicio (antes id_trabajo)
--   3. evento_trabajo.id_servicio NULL -> servicio.id_servicio
--   4. Se ordenan las tablas dependientes despues de servicio.
-- ATENCION: Solo se conoce PARTE del contrato Prisma. No se garantiza
-- compatibilidad integral sin comparar el contrato completo y probarlo.
-- Ejecutar EXCLUSIVAMENTE en una base de datos VACIA de pruebas.
-- No usar sobre la base real de Mauritzio ni ejecutar dos veces.
-- El SQL no contiene datos de ejemplo, triggers ni indices adicionales.
-- =====================================================================

-- =====================================================================
-- 01_types.sql  ·  Extensiones y tipos ENUM
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- solo se usa para hashear contraseñas de prueba

CREATE TYPE estado_aprobacion_enum   AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE estado_publicacion_enum  AS ENUM ('abierto', 'cerrado', 'cancelado');
CREATE TYPE estado_propuesta_enum    AS ENUM ('pendiente','contrapropuesta', 'aceptada', 'rechazada', 'retirada');
CREATE TYPE estado_visita_enum       AS ENUM ('programada', 'realizada', 'cancelada');
CREATE TYPE estado_servicio_enum     AS ENUM ('programado', 'en_progreso', 'completado', 'cancelado');
CREATE TYPE metodo_pago_enum         AS ENUM ('efectivo', 'qr', 'transferencia');
CREATE TYPE estado_pago_enum         AS ENUM ('declarado', 'confirmado', 'rechazado', 'aprovado', 'aprobado');
CREATE TYPE estado_reclamo_enum      AS ENUM ('abierto', 'en_revision', 'resuelto', 'rechazado');
CREATE TYPE tipo_solicitud_enum      AS ENUM ('abierta', 'directa');

-- =====================================================================
-- 02_tables.sql  ·  Solo tablas y constraints (los índices van en 03)
-- =====================================================================

-- ---------- USUARIOS Y PERFILES ----------
CREATE TABLE usuario (
    id_usuario      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(180) NOT NULL,
    telefono        VARCHAR(25),
    password_hash   VARCHAR(255) NOT NULL,
    fecha_registro  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE rol (
    id_rol  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE usuario_rol (
    id_usuario  INT NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    id_rol      INT NOT NULL REFERENCES rol (id_rol)         ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

-- Perfil 1:1 con usuario. id_reparador en el resto del esquema = perfil_trabajador.id_usuario
CREATE TABLE perfil_trabajador (
    id_usuario         INT PRIMARY KEY REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    experiencia_anios   SMALLINT CHECK ( experiencia_anios>= 0 AND experiencia_anios <= 100),
    estado_aprobacion  estado_aprobacion_enum NOT NULL DEFAULT 'pendiente'
);

CREATE TABLE documento_usuario (
    id_documento_us  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario       INT NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    tipo_documento   VARCHAR(50) NOT NULL,
    ubucacion_archivo      TEXT NOT NULL,
    estado           estado_aprobacion_enum NOT NULL DEFAULT 'pendiente',
    fecha_subida     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CATÁLOGOS Y COBERTURA DEL REPARADOR ----------
CREATE TABLE categoria (
    id_categoria  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE categoria_reparador (
    id_categoria  INT NOT NULL REFERENCES categoria (id_categoria)        ON DELETE CASCADE,
    id_reparador  INT NOT NULL REFERENCES perfil_trabajador (id_usuario)  ON DELETE CASCADE,
    PRIMARY KEY (id_categoria, id_reparador)
);
CREATE TABLE zona_reparador (
    id_zona_rep   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reparador  INT NOT NULL REFERENCES perfil_trabajador (id_usuario) ON DELETE CASCADE,
    etiqueta      VARCHAR(60), -- Ej: 'Mi Taller', 'Casa'
    latitud       NUMERIC(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud      NUMERIC(9,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    radio_good    INT NOT NULL CHECK (radio_good > 0),
    radio_medio   INT NOT NULL CHECK (radio_medio > radio_good),
    radio_bad     INT NOT NULL CHECK (radio_bad > radio_medio)
);


CREATE TABLE disponibilidad (
    id_disponibilidad  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reparador       INT NOT NULL REFERENCES perfil_trabajador (id_usuario) ON DELETE CASCADE,
    dia_semana         SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),  -- 1 = lunes ... 7 = domingo
    hora_inicio        TIME NOT NULL,
    hora_fin           TIME NOT NULL,
    CHECK (hora_fin > hora_inicio),
    UNIQUE (id_reparador, dia_semana, hora_inicio)
);

-- ---------- TRABAJOS ----------
CREATE TABLE trabajo (
    id_trabajo          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente          INT NOT NULL REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    titulo              VARCHAR(150) NOT NULL,
    descripcion         TEXT NOT NULL,
    direccion           TEXT NOT NULL,
    latitud             NUMERIC(9,6) CHECK (latitud  BETWEEN -90  AND 90),
    longitud            NUMERIC(9,6) CHECK (longitud BETWEEN -180 AND 180),
    fecha_preferida     TIMESTAMPTZ,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado_publicacion  estado_publicacion_enum NOT NULL DEFAULT 'abierto',
    tipo_solicitud      tipo_solicitud_enum NOT NULL DEFAULT 'abierta',
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE categoria_trabajo (
    id_categoria  INT NOT NULL REFERENCES categoria (id_categoria) ON DELETE CASCADE,
    id_trabajo    INT NOT NULL REFERENCES trabajo (id_trabajo)     ON DELETE CASCADE,
    PRIMARY KEY (id_categoria, id_trabajo)
);

CREATE TABLE documento_trabajo (
    id_documento    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo      INT NOT NULL REFERENCES trabajo (id_trabajo) ON DELETE CASCADE,
    tipo_documento  VARCHAR(50),
    archivo_url     TEXT NOT NULL,
    fecha_subida    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------- PROPUESTA -> VISITA -> SERVICIO ----------
CREATE TABLE propuesta (
    id_propuesta         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo           INT NOT NULL REFERENCES trabajo (id_trabajo) ON DELETE CASCADE,
    id_reparador         INT NOT NULL REFERENCES perfil_trabajador (id_usuario) ON DELETE RESTRICT,
    precio_total         NUMERIC(12,2) NOT NULL CHECK (precio_total >= 0),
    precio_contrapropuesta NUMERIC(12,2) CHECK (precio_contrapropuesta >= 0),
    costo_visita         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_visita >= 0),
    materiales_incluidos BOOLEAN NOT NULL DEFAULT false,
    detalle_materiales   TEXT,
    estado               estado_propuesta_enum NOT NULL DEFAULT 'pendiente',
    fecha_propuesta      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_trabajo, id_reparador)
);


CREATE TABLE servicio (
    id_servicio         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_propuesta        INT NOT NULL UNIQUE REFERENCES propuesta (id_propuesta) ON DELETE RESTRICT,
    estado              estado_servicio_enum NOT NULL DEFAULT 'programado',
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_finalizacion  TIMESTAMPTZ
);

-- ---------- EVENTOS Y VISITAS VINCULADOS AL SERVICIO ----------
-- Bitácora de eventos (no se incluyen triggers en el archivo original)
CREATE TABLE evento_trabajo (
    id_evento     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo    INT NOT NULL REFERENCES trabajo (id_trabajo) ON DELETE CASCADE,
    id_usuario    INT REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    tipo_evento   VARCHAR(60) NOT NULL,
    fecha_evento  TIMESTAMPTZ NOT NULL DEFAULT now(),
    detalle       TEXT,
    id_servicio   INT REFERENCES servicio (id_servicio) ON DELETE CASCADE
);

CREATE TABLE visita (
    id_visita     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio  INT NOT NULL REFERENCES servicio (id_servicio) ON DELETE CASCADE,
    fecha_inicio  TIMESTAMPTZ NOT NULL,
    fecha_fin     TIMESTAMPTZ,
    estado        estado_visita_enum NOT NULL DEFAULT 'programada',
    CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio)
);

-- ---------- DINERO ----------
-- monto_nuevo = nuevo TOTAL del servicio (no la diferencia)
CREATE TABLE incremento_presupuesto (
    id_incremento      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio        INT NOT NULL REFERENCES servicio (id_servicio) ON DELETE CASCADE,
    id_solicitante     INT REFERENCES usuario (id_usuario),
    monto_anterior     NUMERIC(12,2) NOT NULL CHECK (monto_anterior >= 0),
    monto_nuevo        NUMERIC(12,2) NOT NULL CHECK (monto_nuevo > 0),
    motivo             TEXT NOT NULL,
    estado_aprobacion  estado_aprobacion_enum NOT NULL DEFAULT 'pendiente',
    fecha_solicitud    TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_respuesta    TIMESTAMPTZ
);

CREATE TABLE pago (
    id_pago             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio         INT NOT NULL REFERENCES servicio (id_servicio) ON DELETE RESTRICT,
    monto               NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    metodo              metodo_pago_enum NOT NULL,
    comprobante_url     TEXT,
    estado              estado_pago_enum NOT NULL DEFAULT 'declarado',
    fecha_declaracion   TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_confirmacion  TIMESTAMPTZ,
    CHECK (fecha_confirmacion IS NULL OR fecha_confirmacion >= fecha_declaracion)
);

-- ---------- CALIFICACIONES Y RECLAMOS ----------
CREATE TABLE calificacion (
    id_calificacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio      INT NOT NULL REFERENCES servicio (id_servicio) ON DELETE RESTRICT,
    id_evaluador     INT NOT NULL REFERENCES usuario (id_usuario)   ON DELETE RESTRICT,
    id_evaluado      INT NOT NULL REFERENCES usuario (id_usuario)   ON DELETE RESTRICT,
    puntuacion       SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario       TEXT,
    fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (id_evaluador <> id_evaluado),
    UNIQUE (id_servicio, id_evaluador)
);

CREATE TABLE reclamo (
    id_reclamo      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio     INT NOT NULL REFERENCES servicio (id_servicio) ON DELETE RESTRICT,
    id_usuario      INT NOT NULL REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    motivo          TEXT NOT NULL,
    estado          estado_reclamo_enum NOT NULL DEFAULT 'abierto',
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reclamo_accion (
    id_accion    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reclamo   INT NOT NULL REFERENCES reclamo (id_reclamo) ON DELETE CASCADE,
    id_soporte   INT NOT NULL REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    descripcion  TEXT NOT NULL,
    fecha_accion TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
