-- Enunciado 11 - Joel Torrico: historial de reprogramaciones de visitas.
-- Ejecutar en PostgreSQL UNA VEZ (puede repetirse sin borrar datos).
CREATE TABLE IF NOT EXISTS reprogramacion_visita (
    id_reprogramacion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_visita INTEGER NOT NULL REFERENCES visita(id_visita) ON DELETE CASCADE,
    id_solicitante INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_revisor INTEGER REFERENCES usuario(id_usuario),
    fecha_anterior_inicio TIMESTAMPTZ NOT NULL,
    fecha_anterior_fin TIMESTAMPTZ NOT NULL,
    fecha_nueva_inicio TIMESTAMPTZ NOT NULL,
    fecha_nueva_fin TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    estado VARCHAR(12) NOT NULL DEFAULT 'pendiente',
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_respuesta TIMESTAMPTZ,
    CONSTRAINT reprogramacion_estado_valido CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    CONSTRAINT reprogramacion_fechas_validas CHECK (fecha_nueva_fin > fecha_nueva_inicio)
);

-- Una visita puede tener varias solicitudes historicas, pero solo una pendiente.
CREATE UNIQUE INDEX IF NOT EXISTS ux_reprogramacion_visita_pendiente
ON reprogramacion_visita(id_visita) WHERE estado = 'pendiente';

CREATE INDEX IF NOT EXISTS ix_reprogramacion_visita_fecha
ON reprogramacion_visita(id_visita, fecha_solicitud DESC);
