-------------------------------------------


-- A) BEFORE INSERT: Autollenar monto_anterior desde la propuesta aceptada
CREATE OR REPLACE FUNCTION fn_presupuesto_auto_monto_anterior()
RETURNS TRIGGER AS $$
DECLARE
    v_precio_actual NUMERIC(12,2);
    v_id_reparador  INT;
BEGIN
    SELECT p.precio_total, p.id_reparador
      INTO v_precio_actual, v_id_reparador
      FROM servicio s
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
     WHERE s.id_servicio = NEW.id_servicio;

    IF v_precio_actual IS NULL THEN
        RAISE EXCEPTION 'No se encontró una propuesta asociada al servicio ID %.', NEW.id_servicio;
    END IF;

    -- Anotar automáticamente el monto actual de la propuesta
    NEW.monto_anterior := v_precio_actual;

    IF NEW.monto_nuevo = NEW.monto_anterior THEN
        RAISE EXCEPTION 'El monto nuevo (%) debe ser distinto al monto actual (%).', NEW.monto_nuevo, NEW.monto_anterior;
    END IF;

    -- Disminución: solo puede enviarla el reparador y se aprueba automáticamente
    IF NEW.monto_nuevo < NEW.monto_anterior THEN
        IF NEW.id_solicitante IS DISTINCT FROM v_id_reparador THEN
            RAISE EXCEPTION 'Solo el reparador asignado puede registrar una disminución de presupuesto.';
        END IF;

        NEW.estado_aprobacion := 'aprobado';
        NEW.fecha_respuesta   := now();
    ELSE
        -- Incremento: queda pendiente salvo que ya venga marcado como 'aprobado'
        IF NEW.estado_aprobacion IS NULL OR NEW.estado_aprobacion <> 'aprobado' THEN
            NEW.estado_aprobacion := 'pendiente';
            NEW.fecha_respuesta   := NULL;
        ELSE
            NEW.fecha_respuesta   := COALESCE(NEW.fecha_respuesta, now());
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_presupuesto ON incremento_presupuesto;
CREATE TRIGGER trg_validar_presupuesto
BEFORE INSERT ON incremento_presupuesto
FOR EACH ROW
EXECUTE FUNCTION fn_presupuesto_auto_monto_anterior();


-- B) AFTER INSERT OR UPDATE: Actualizar precio_total en propuesta cuando esté aprobado
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


-----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_ajuste_automatico_por_pago_menor()
RETURNS TRIGGER AS $$
DECLARE
    v_monto_acordado NUMERIC(12,2);
    v_id_reparador   INT;
BEGIN
    IF NEW.estado IN ('confirmado', 'aprobado')
       AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN

        SELECT p.precio_total, p.id_reparador
          INTO v_monto_acordado, v_id_reparador
          FROM servicio s
          JOIN propuesta p ON p.id_propuesta = s.id_propuesta
         WHERE s.id_servicio = NEW.id_servicio;

        IF NEW.monto < v_monto_acordado THEN
            INSERT INTO incremento_presupuesto (
                id_servicio,
                id_solicitante,
                monto_anterior,
                monto_nuevo,
                motivo,
                estado_aprobacion,
                fecha_respuesta
            ) VALUES (
                NEW.id_servicio,
                v_id_reparador,
                v_monto_acordado,
                NEW.monto,
                'Ajuste automático por confirmación de pago menor al monto acordado (Pago ID #' || NEW.id_pago || ').',
                'aprobado',
                now()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ajuste_automatico_por_pago_menor ON pago;
CREATE TRIGGER trg_ajuste_automatico_por_pago_menor
AFTER INSERT OR UPDATE OF estado ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_ajuste_automatico_por_pago_menor();



----------------
DROP FUNCTION IF EXISTS fn_validar_presupuesto();