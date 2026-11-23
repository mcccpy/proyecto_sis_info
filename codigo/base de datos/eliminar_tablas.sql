DROP TABLE usuario ;
DROP TABLE rol ;
DROP TABLE usuario_rol ;

-- Perfil 1:1 con usuario. id_reparador en el resto del esquema = perfil_trabajador.id_usuario
DROP TABLE perfil_trabajador ;

DROP TABLE documento_usuario ;

-- ---------- CATÁLOGOS Y COBERTURA DEL REPARADOR ----------
DROP TABLE categoria ;
DROP TABLE categoria_reparador ;
DROP TABLE zona_reparador ;
DROP TABLE disponibilidad ;
-- ---------- TRABAJOS ----------
DROP TABLE trabajo ;
DROP TABLE categoria_trabajo ;
DROP TABLE documento_trabajo ;


-- Bitácora de todo lo que pasa en un trabajo ;la llenan los triggers)
DROP TABLE evento_trabajo ;


-- ---------- PROPUESTA -> VISITA -> SERVICIO ----------
DROP TABLE propuesta ;
DROP TABLE visita ;
DROP TABLE servicio ;


-- ---------- DINERO ----------
-- monto_nuevo = nuevo TOTAL del servicio ;no la diferencia)
DROP TABLE incremento_presupuesto ;
DROP TABLE pago ;

-- ---------- CALIFICACIONES Y RECLAMOS ----------
DROP TABLE calificacion ;
DROP TABLE reclamo ;
DROP TABLE reclamo_accion ;