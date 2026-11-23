-- 04_triggers.sql · Reglas de negocio y automatización (PostgreSQL)
-- Compatible con sql_tablas_3.sql
-- =====================================================================
trg_republicar_por_cancelacion
trg_validar_cierre_servicio
-- ---------------------------------------------------------------------
-- 1. Límite máximo de 3 zonas fijas por reparador
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_limite_tres_zonas()
RETURNS TRIGGER AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COUNT(*)
      INTO v_total
      FROM zona_reparador
     WHERE id_reparador = NEW.id_reparador;

    IF v_total >= 3 THEN
        RAISE EXCEPTION 'El reparador (ID %) ya alcanzó el límite máximo de 3 zonas registradas.', NEW.id_reparador;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_limite_tres_zonas ON zona_reparador;
CREATE TRIGGER trg_limite_tres_zonas
BEFORE INSERT ON zona_reparador
FOR EACH ROW
EXECUTE FUNCTION fn_limite_tres_zonas();


-- ---------------------------------------------------------------------
-- 2. Aceptación de propuesta: cierra trabajo, rechaza otras ofertas y crea servicio
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aceptar_propuesta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'aceptada' AND OLD.estado IS DISTINCT FROM 'aceptada' THEN
        -- Cerrar la publicación del trabajo
        UPDATE trabajo
           SET estado_publicacion = 'cerrado'
         WHERE id_trabajo = NEW.id_trabajo;

        -- Rechazar automáticamente las demás propuestas pendientes del mismo trabajo
        UPDATE propuesta
           SET estado = 'rechazada'
         WHERE id_trabajo = NEW.id_trabajo
           AND id_propuesta <> NEW.id_propuesta
           AND estado = 'pendiente';

        -- Crear el servicio asociado en estado 'programado' si no existe aún
        INSERT INTO servicio (id_propuesta, estado)
        VALUES (NEW.id_propuesta, 'programado')
        ON CONFLICT (id_propuesta) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aceptar_propuesta ON propuesta;
CREATE TRIGGER trg_aceptar_propuesta
AFTER UPDATE OF estado ON propuesta
FOR EACH ROW
EXECUTE FUNCTION fn_aceptar_propuesta();


-- ---------------------------------------------------------------------
-- 3. Republicación automática si se rechaza una solicitud directa
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_republicar_por_rechazo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'rechazada' AND OLD.estado IS DISTINCT FROM 'rechazada' THEN
        UPDATE trabajo
           SET tipo_solicitud = 'abierta',
               estado_publicacion = 'abierto'
         WHERE id_trabajo = NEW.id_trabajo
           AND tipo_solicitud = 'directa';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_republicar_por_rechazo ON propuesta;
CREATE TRIGGER trg_republicar_por_rechazo
AFTER UPDATE OF estado ON propuesta
FOR EACH ROW
EXECUTE FUNCTION fn_republicar_por_rechazo();


-- ---------------------------------------------------------------------
-- 4. Validar cancelación de visita según el estado del servicio
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_cancelacion_visita()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_servicio estado_servicio_enum;
BEGIN
    IF NEW.estado = 'cancelada' AND OLD.estado IS DISTINCT FROM 'cancelada' THEN
        SELECT estado
          INTO v_estado_servicio
          FROM servicio
         WHERE id_servicio = NEW.id_servicio;

        IF v_estado_servicio IN ('en_progreso', 'completado', 'cancelado') THEN
            RAISE EXCEPTION 'No se puede cancelar la visita porque el servicio está en estado "%".', v_estado_servicio;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_cancelacion_visita ON visita;
CREATE TRIGGER trg_validar_cancelacion_visita
BEFORE UPDATE OF estado ON visita
FOR EACH ROW
EXECUTE FUNCTION fn_validar_cancelacion_visita();


-- ---------------------------------------------------------------------
-- 5. Republicación automática si se cancela el servicio
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_republicar_por_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cliente     INT;
    v_id_solicitante INT;
    v_motivo_extra   TEXT;
    v_motivo_final   TEXT;
BEGIN
    IF NEW.estado = 'cancelado' AND OLD.estado IS DISTINCT FROM 'cancelado' THEN
        -- 1. Republicar el trabajo como público y abierto
        UPDATE trabajo t
           SET tipo_solicitud = 'abierta',
               estado_publicacion = 'abierto'
          FROM propuesta p
         WHERE p.id_propuesta = NEW.id_propuesta
           AND t.id_trabajo = p.id_trabajo
        RETURNING t.id_cliente INTO v_id_cliente;

        -- 2. Obtener usuario que cancela y motivo opcional desde la sesión (o usar valores por defecto)
        v_id_solicitante := COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::INT,
            v_id_cliente
        );
        v_motivo_extra := NULLIF(current_setting('app.motivo_cancelacion', true), '');

        v_motivo_final := 'Solicitud de cancelación de servicio #' || NEW.id_servicio ||
                          COALESCE(': ' || v_motivo_extra, ': Cancelación solicitada por el usuario.');

        -- 3. Generar reclamo automático para revisión/aprobación del administrador
        INSERT INTO reclamo (id_servicio, id_usuario, motivo, estado)
        VALUES (NEW.id_servicio, v_id_solicitante, v_motivo_final, 'abierto');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_republicar_por_cancelacion ON servicio;
CREATE TRIGGER trg_republicar_por_cancelacion
AFTER UPDATE OF estado ON servicio
FOR EACH ROW
EXECUTE FUNCTION fn_republicar_por_cancelacion();


-- ---------------------------------------------------------------------
-- 6. Bloquear cierre de servicio sin pago confirmado y registrar fecha_finalizacion
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_cierre_servicio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'completado' AND OLD.estado IS DISTINCT FROM 'completado' THEN
        IF NOT EXISTS (
            SELECT 1
              FROM pago
             WHERE id_servicio = NEW.id_servicio
               AND estado IN ('confirmado', 'aprobado')
        ) THEN
            RAISE EXCEPTION 'No se puede marcar el servicio como completado sin un pago confirmado o aprobado.';
        END IF;

        NEW.fecha_finalizacion := COALESCE(NEW.fecha_finalizacion, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_cierre_servicio ON servicio;
CREATE TRIGGER trg_validar_cierre_servicio
BEFORE UPDATE OF estado ON servicio
FOR EACH ROW
EXECUTE FUNCTION fn_validar_cierre_servicio();


-- ---------------------------------------------------------------------
-- 7. Validar incremento o disminución de presupuesto al insertar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
    v_id_reparador INT;
BEGIN
    IF NEW.monto_nuevo = NEW.monto_anterior THEN
        RAISE EXCEPTION 'El monto nuevo (%) debe ser distinto al monto anterior (%).', NEW.monto_nuevo, NEW.monto_anterior;
    END IF;

    SELECT p.id_reparador
      INTO v_id_reparador
      FROM servicio s
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
     WHERE s.id_servicio = NEW.id_servicio;

    -- Disminución: solo puede enviarla el reparador y se aprueba automáticamente
    IF NEW.monto_nuevo < NEW.monto_anterior THEN
        IF NEW.id_solicitante IS DISTINCT FROM v_id_reparador THEN
            RAISE EXCEPTION 'Solo el reparador asignado puede registrar una disminución de presupuesto.';
        END IF;

        NEW.estado_aprobacion := 'aprobado';
        NEW.fecha_respuesta   := now();
    ELSE
        -- Incremento: siempre queda pendiente de aprobación por un administrador
        NEW.estado_aprobacion := 'pendiente';
        NEW.fecha_respuesta   := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_presupuesto ON incremento_presupuesto;
CREATE TRIGGER trg_validar_presupuesto
BEFORE INSERT ON incremento_presupuesto
FOR EACH ROW
EXECUTE FUNCTION fn_validar_presupuesto();


-- ---------------------------------------------------------------------
-- 8. Sobrescribir precio_total en propuesta cuando un ajuste quede aprobado
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aplicar_aumento_aprobado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_aprobacion = 'aprobado'
       AND (TG_OP = 'INSERT' OR OLD.estado_aprobacion IS DISTINCT FROM 'aprobado') THEN
        UPDATE propuesta p
           SET precio_total = NEW.monto_nuevo
          FROM servicio s
         WHERE s.id_servicio = NEW.id_servicio
           AND p.id_propuesta = s.id_propuesta;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aplicar_aumento_aprobado ON incremento_presupuesto;
CREATE TRIGGER trg_aplicar_aumento_aprobado
AFTER INSERT OR UPDATE OF estado_aprobacion ON incremento_presupuesto
FOR EACH ROW
EXECUTE FUNCTION fn_aplicar_aumento_aprobado();


-- ---------------------------------------------------------------------
-- 9. Validar roles y participantes en calificaciones
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_calificacion()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cliente   INT;
    v_id_reparador INT;
    v_es_admin     BOOLEAN;
BEGIN
    SELECT t.id_cliente, p.id_reparador
      INTO v_id_cliente, v_id_reparador
      FROM servicio s
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
      JOIN trabajo t   ON t.id_trabajo = p.id_trabajo
     WHERE s.id_servicio = NEW.id_servicio;

    IF NEW.id_evaluado IS DISTINCT FROM v_id_reparador THEN
        RAISE EXCEPTION 'El usuario evaluado (ID %) debe ser el reparador que ejecutó el servicio (ID %).', NEW.id_evaluado, v_id_reparador;
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM usuario_rol ur
          JOIN rol r ON r.id_rol = ur.id_rol
         WHERE ur.id_usuario = NEW.id_evaluador
           AND r.nombre = 'administrador'
    ) INTO v_es_admin;

    IF NEW.id_evaluador IS DISTINCT FROM v_id_cliente AND NOT v_es_admin THEN
        RAISE EXCEPTION 'Solo el cliente del servicio o un administrador pueden registrar una calificación.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_calificacion ON calificacion;
CREATE TRIGGER trg_validar_calificacion
BEFORE INSERT ON calificacion
FOR EACH ROW
EXECUTE FUNCTION fn_validar_calificacion();


-- ---------------------------------------------------------------------
-- 10. Validar plazo máximo de 2 meses post-finalización para reclamos
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_plazo_reclamo()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_fin TIMESTAMPTZ;
BEGIN
    SELECT fecha_finalizacion
      INTO v_fecha_fin
      FROM servicio
     WHERE id_servicio = NEW.id_servicio;

    IF v_fecha_fin IS NOT NULL AND now() > (v_fecha_fin + INTERVAL '2 months') THEN
        RAISE EXCEPTION 'El plazo máximo de 2 meses desde la finalización del servicio (%) ha expirado.', v_fecha_fin;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_plazo_reclamo ON reclamo;
CREATE TRIGGER trg_validar_plazo_reclamo
BEFORE INSERT ON reclamo
FOR EACH ROW
EXECUTE FUNCTION fn_validar_plazo_reclamo();


-- ---------------------------------------------------------------------
-- 11. Restringir respuestas en reclamo_accion exclusivamente a administradores
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_admin_reclamo()
RETURNS TRIGGER AS $$
DECLARE
    v_es_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
          FROM usuario_rol ur
          JOIN rol r ON r.id_rol = ur.id_rol
         WHERE ur.id_usuario = NEW.id_soporte
           AND r.nombre = 'administrador'
    ) INTO v_es_admin;

    IF NOT v_es_admin THEN
        RAISE EXCEPTION 'Solo un usuario con rol administrador puede registrar acciones en reclamo_accion.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_admin_reclamo ON reclamo_accion;
CREATE TRIGGER trg_validar_admin_reclamo
BEFORE INSERT ON reclamo_accion
FOR EACH ROW
EXECUTE FUNCTION fn_validar_admin_reclamo();


-- ---------------------------------------------------------------------
-- 12. Auditoría automática en evento_trabajo
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditoria_evento_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    v_id_trabajo INT;
    v_id_usuario INT;
    v_tipo       VARCHAR(60);
    v_detalle    TEXT;
BEGIN
    IF TG_TABLE_NAME = 'trabajo' THEN
        v_id_trabajo := NEW.id_trabajo;
        v_id_usuario := NEW.id_cliente;
        IF TG_OP = 'INSERT' THEN
            v_tipo    := 'TRABAJO_CREADO';
            v_detalle := 'Solicitud ' || NEW.tipo_solicitud || ' creada: ' || NEW.titulo;
        ELSIF NEW.estado_publicacion IS DISTINCT FROM OLD.estado_publicacion THEN
            v_tipo    := 'TRABAJO_ESTADO_' || upper(NEW.estado_publicacion::TEXT);
            v_detalle := 'Estado de publicación cambió de ' || OLD.estado_publicacion || ' a ' || NEW.estado_publicacion;
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'propuesta' THEN
        v_id_trabajo := NEW.id_trabajo;
        v_id_usuario := NEW.id_reparador;
        IF TG_OP = 'INSERT' THEN
            v_tipo    := 'PROPUESTA_CREADA';
            v_detalle := 'Propuesta creada por monto ' || NEW.precio_total;
        ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
            v_tipo    := 'PROPUESTA_' || upper(NEW.estado::TEXT);
            v_detalle := 'Propuesta ID ' || NEW.id_propuesta || ' pasó a estado ' || NEW.estado;
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'servicio' THEN
        SELECT p.id_trabajo, p.id_reparador
          INTO v_id_trabajo, v_id_usuario
          FROM propuesta p
         WHERE p.id_propuesta = NEW.id_propuesta;

        IF TG_OP = 'INSERT' THEN
            v_tipo    := 'SERVICIO_CREADO';
            v_detalle := 'Servicio ID ' || NEW.id_servicio || ' iniciado en estado ' || NEW.estado;
        ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
            v_tipo    := 'SERVICIO_' || upper(NEW.estado::TEXT);
            v_detalle := 'Servicio ID ' || NEW.id_servicio || ' cambió de ' || OLD.estado || ' a ' || NEW.estado;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO evento_trabajo (id_trabajo, id_usuario, tipo_evento, detalle)
    VALUES (v_id_trabajo, v_id_usuario, v_tipo, v_detalle);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_trabajo ON trabajo;
CREATE TRIGGER trg_auditoria_trabajo
AFTER INSERT OR UPDATE OF estado_publicacion ON trabajo
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_evento_trabajo();

DROP TRIGGER IF EXISTS trg_auditoria_propuesta ON propuesta;
CREATE TRIGGER trg_auditoria_propuesta
AFTER INSERT OR UPDATE OF estado ON propuesta
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_evento_trabajo();

DROP TRIGGER IF EXISTS trg_auditoria_servicio ON servicio;
CREATE TRIGGER trg_auditoria_servicio
AFTER INSERT OR UPDATE OF estado ON servicio
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_evento_trabajo();


CREATE OR REPLACE FUNCTION fn_visita_realizada_progreso()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'realizada' AND OLD.estado IS DISTINCT FROM 'realizada' THEN
        -- Si fecha_fin es NULL o si la hora actual superó la fecha_fin programada, actualiza a now()
        IF NEW.fecha_fin IS NULL OR now() > NEW.fecha_fin THEN
            NEW.fecha_fin := now();
        END IF;

        -- Cambiar el servicio a 'en_progreso' si aún estaba 'programado'
        UPDATE servicio
           SET estado = 'en_progreso'
         WHERE id_servicio = NEW.id_servicio
           AND estado = 'programado';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visita_realizada_progreso ON visita;
CREATE TRIGGER trg_visita_realizada_progreso
BEFORE UPDATE OF estado ON visita
FOR EACH ROW
EXECUTE FUNCTION fn_visita_realizada_progreso();