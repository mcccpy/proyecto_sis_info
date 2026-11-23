DELETE FROM usuario ;
DELETE FROM rol ;
DELETE FROM usuario_rol ;

-- Perfil 1:1 con usuario. id_reparador en el resto del esquema = perfil_trabajador.id_usuario
DELETE FROM perfil_trabajador ;

DELETE FROM documento_usuario ;

-- ---------- CATÁLOGOS Y COBERTURA DEL REPARADOR ----------
DELETE FROM categoria ;
DELETE FROM categoria_reparador ;
DELETE FROM zona_reparador ;
DELETE FROM disponibilidad ;
-- ---------- TRABAJOS ----------
DELETE FROM trabajo ;
DELETE FROM categoria_trabajo ;
DELETE FROM documento_trabajo ;


-- Bitácora de todo lo que pasa en un trabajo ;la llenan los triggers)
DELETE FROM evento_trabajo ;


-- ---------- PROPUESTA -> VISITA -> SERVICIO ----------
DELETE FROM propuesta ;
DELETE FROM visita ;
DELETE FROM servicio ;


-- ---------- DINERO ----------
-- monto_nuevo = nuevo TOTAL del servicio ;no la diferencia)
DELETE FROM incremento_presupuesto ;
DELETE FROM pago ;

-- ---------- CALIFICACIONES Y RECLAMOS ----------
DELETE FROM calificacion ;
DELETE FROM reclamo ;
DELETE FROM reclamo_accion ;
TRUNCATE TABLE 
    reclamo_accion,
    reclamo,
    calificacion,
    pago,
    incremento_presupuesto,
    visita,
    servicio,
    propuesta,
    evento_trabajo,
    documento_trabajo,
    categoria_trabajo,
    trabajo,
    disponibilidad,
    zona_reparador,
    categoria_reparador,
    categoria,
    documento_usuario,
    perfil_trabajador,
    usuario_rol,
    rol,
    usuario
RESTART IDENTITY CASCADE;



