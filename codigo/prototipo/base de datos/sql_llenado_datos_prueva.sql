-- =====================================================================
-- 07_seed.sql  ·  Datos de prueba  (ejecutar DESPUÉS de 01..06, en base vacía)
-- Contraseña de todos los usuarios: Test1234
--
-- Usuarios:  1-10  solo clientes (el 1 también es admin/soporte)
--            11-20 clientes Y reparadores  (10 usuarios "ambos")
--            21-30 solo reparadores
-- id_reparador = id_usuario
-- =====================================================================

-- ---------- 1. CATÁLOGOS ----------
INSERT INTO rol (nombre) VALUES ('cliente'), ('reparador'), ('admin');            -- 1, 2, 3

INSERT INTO categoria (nombre) VALUES
    ('Plomería'), ('Electricidad'), ('Carpintería'), ('Pintura'),                 -- 1, 2, 3, 4
    ('Cerrajería'), ('Albañilería'), ('Aire acondicionado'), ('Electrodomésticos');-- 5, 6, 7, 8

INSERT INTO zona (nombre) VALUES
    ('Centro'), ('Norte'), ('Sur'), ('Cala Cala'),                                -- 1, 2, 3, 4
    ('Sarco'), ('Quillacollo'), ('Tiquipaya'), ('Sacaba');                        -- 5, 6, 7, 8

-- ---------- 2. USUARIOS (30) ----------
INSERT INTO usuario (nombre, email, telefono, password_hash)
SELECT v.nombre, v.email, v.telefono, crypt('Test1234', gen_salt('bf'))
FROM (VALUES
    ('Carlos Mamani',       'carlos.mamani@mail.com',       '70011001'),  -- 1  cliente + admin
    ('Lucía Fernández',     'lucia.fernandez@mail.com',     '70011002'),  -- 2
    ('Andrés Gutiérrez',    'andres.gutierrez@mail.com',    '70011003'),  -- 3
    ('María Rojas',         'maria.rojas@mail.com',         '70011004'),  -- 4
    ('Jorge Camacho',       'jorge.camacho@mail.com',       '70011005'),  -- 5
    ('Sofía Vargas',        'sofia.vargas@mail.com',        '70011006'),  -- 6
    ('Diego Salvatierra',   'diego.salvatierra@mail.com',   '70011007'),  -- 7
    ('Valeria Claure',      'valeria.claure@mail.com',      '70011008'),  -- 8
    ('Marco Antezana',      'marco.antezana@mail.com',      '70011009'),  -- 9
    ('Daniela Arce',        'daniela.arce@mail.com',        '70011010'),  -- 10
    ('Pedro Villarroel',    'pedro.villarroel@mail.com',    '70011011'),  -- 11 ambos
    ('Camila Peredo',       'camila.peredo@mail.com',       '70011012'),  -- 12 ambos
    ('Luis Zurita',         'luis.zurita@mail.com',         '70011013'),  -- 13 ambos
    ('Ana Montaño',         'ana.montano@mail.com',         '70011014'),  -- 14 ambos
    ('Ricardo Terrazas',    'ricardo.terrazas@mail.com',    '70011015'),  -- 15 ambos
    ('Paola Mendoza',       'paola.mendoza@mail.com',       '70011016'),  -- 16 ambos
    ('Fernando Lazarte',    'fernando.lazarte@mail.com',    '70011017'),  -- 17 ambos
    ('Gabriela Soria',      'gabriela.soria@mail.com',      '70011018'),  -- 18 ambos
    ('Raúl Condori',        'raul.condori@mail.com',        '70011019'),  -- 19 ambos
    ('Natalia Burgos',      'natalia.burgos@mail.com',      '70011020'),  -- 20 ambos
    ('Hugo Ledezma',        'hugo.ledezma@mail.com',        '70022021'),  -- 21 reparador
    ('Marcelo Aguilar',     'marcelo.aguilar@mail.com',     '70022022'),  -- 22
    ('Julio Choque',        'julio.choque@mail.com',        '70022023'),  -- 23
    ('Wilson Flores',       'wilson.flores@mail.com',       '70022024'),  -- 24
    ('Óscar Rocha',         'oscar.rocha@mail.com',         '70022025'),  -- 25
    ('Mauricio Balderrama', 'mauricio.balderrama@mail.com', '70022026'),  -- 26
    ('Eduardo Cáceres',     'eduardo.caceres@mail.com',     '70022027'),  -- 27
    ('Freddy Tapia',        'freddy.tapia@mail.com',        '70022028'),  -- 28
    ('Roberto Gonzales',    'roberto.gonzales@mail.com',    '70022029'),  -- 29
    ('Limbert Navia',       'limbert.navia@mail.com',       '70022030')   -- 30
) AS v(nombre, email, telefono);

-- ---------- 3. ROLES (20 clientes, 20 reparadores, 1 admin) ----------
INSERT INTO usuario_rol (id_usuario, id_rol) SELECT g, 1 FROM generate_series(1, 20)  g;  -- clientes
INSERT INTO usuario_rol (id_usuario, id_rol) SELECT g, 2 FROM generate_series(11, 30) g;  -- reparadores
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (1, 3);                               -- admin

-- ---------- 4. PERFIL DE REPARADOR (usuarios 11-30) ----------
-- Pendientes: 16 y 24 | Rechazado: 27 | El resto aprobados
INSERT INTO perfil_trabajador (id_usuario, experiencia, estado_aprobacion)
SELECT g,
       ((g % 10) + 2) || ' años de experiencia en trabajos del hogar',
       (CASE WHEN g IN (16, 24) THEN 'pendiente'
             WHEN g = 27        THEN 'rechazado'
             ELSE 'aprobado' END)::estado_aprobacion_enum
FROM generate_series(11, 30) g;

-- Documentos (2 por reparador, con el mismo estado que su perfil)
INSERT INTO documento_usuario (id_usuario, tipo_documento, archivo_url, estado)
SELECT p.id_usuario, t.tipo,
       'https://storage.ejemplo.com/docs/usuario_' || p.id_usuario || '_' || t.tipo || '.pdf',
       p.estado_aprobacion
FROM perfil_trabajador p
CROSS JOIN (VALUES ('cedula_identidad'), ('antecedentes_policiales')) AS t(tipo);

-- Especialidades (2 categorías por reparador)
INSERT INTO categoria_reparador (id_categoria, id_reparador)
SELECT ((id_usuario - 11) % 8) + 1, id_usuario FROM perfil_trabajador
UNION ALL
SELECT ((id_usuario - 8)  % 8) + 1, id_usuario FROM perfil_trabajador;

-- Zonas de cobertura (2 por reparador)
INSERT INTO zona_reparador (id_zona, id_reparador)
SELECT (id_usuario % 8) + 1, id_usuario FROM perfil_trabajador
UNION ALL
SELECT ((id_usuario + 3) % 8) + 1, id_usuario FROM perfil_trabajador;

-- Disponibilidad: lunes a viernes 08-17h; sábados 08-12h para ids pares
INSERT INTO disponibilidad (id_reparador, dia_semana, hora_inicio, hora_fin)
SELECT p.id_usuario, d, '08:00'::time, '17:00'::time
FROM perfil_trabajador p CROSS JOIN generate_series(1, 5) d;

INSERT INTO disponibilidad (id_reparador, dia_semana, hora_inicio, hora_fin)
SELECT id_usuario, 6, '08:00'::time, '12:00'::time
FROM perfil_trabajador WHERE id_usuario % 2 = 0;

-- ---------- 5. TRABAJOS (20, todos nacen 'abierto') ----------
INSERT INTO trabajo (id_cliente, titulo, descripcion, direccion, latitud, longitud, fecha_creacion, fecha_preferida) VALUES
 (1,  'Reparar puerta de closet',            'La puerta corrediza se salió del riel y roza el piso.',  'Av. Heroínas 450, Cochabamba',      -17.393800, -66.156900, now() - interval '50 days', now() - interval '45 days'),  -- 1
 (2,  'Cambiar chapa de puerta principal',   'La chapa actual se trabó y no abre con la llave.',        'Calle Jordán 123, Cochabamba',      -17.395000, -66.154800, now() - interval '48 days', now() - interval '44 days'),  -- 2
 (3,  'Pintar sala y comedor',               'Aproximadamente 60 m2, color blanco hueso.',              'Av. América 1020, Cochabamba',      -17.372000, -66.167000, now() - interval '46 days', now() - interval '40 days'),  -- 3
 (4,  'Reparar lavadora que no centrifuga',  'Lavadora de carga frontal, hace ruido al centrifugar.',   'Calle España 310, Cochabamba',      -17.391500, -66.158000, now() - interval '44 days', now() - interval '38 days'),  -- 4
 (5,  'Mantenimiento de aire acondicionado', 'Limpieza y recarga de gas de equipo split de 12000 BTU.', 'Zona Sarco, Av. Circunvalación 88', -17.368000, -66.152000, now() - interval '42 days', now() - interval '36 days'),  -- 5
 (6,  'Fuga de agua en el baño',             'Gotea la tubería debajo del lavamanos.',                  'Av. Ballivián 765, Cochabamba',     -17.390000, -66.149500, now() - interval '40 days', now() - interval '34 days'),  -- 6
 (7,  'Instalar tomacorrientes en cocina',   'Se necesitan 4 tomacorrientes nuevos sobre la mesada.',   'Cala Cala, Calle Los Pinos 12',     -17.361000, -66.159000, now() - interval '38 days', now() - interval '32 days'),  -- 7
 (8,  'Pintar fachada exterior',             'Casa de dos plantas, requiere andamio.',                  'Av. Blanco Galindo km 4',           -17.396000, -66.205000, now() - interval '36 days', now() - interval '28 days'),  -- 8
 (11, 'Pintar dormitorio principal',         'Cuarto de 4x4 m, color gris claro.',                      'Av. Villazón km 2, Cochabamba',     -17.380000, -66.175000, now() - interval '34 days', now() - interval '26 days'),  -- 9
 (12, 'Cambiar grifería de cocina',          'Grifo monocomando nuevo ya comprado.',                    'Calle Tarata 250, Cochabamba',      -17.401000, -66.158000, now() - interval '32 days', now() - interval '24 days'),  -- 10
 (13, 'Reparar refrigeradora',               'No enfría el congelador.',                                'Av. Oquendo 540, Cochabamba',       -17.392000, -66.161000, now() - interval '30 days', now() - interval '22 days'),  -- 11
 (14, 'Instalar aire acondicionado split',   'Equipo ya comprado, falta instalación con soporte.',      'Tiquipaya, Calle Principal 5',      -17.338000, -66.213000, now() - interval '28 days', now() - interval '20 days'),  -- 12
 (15, 'Cambiar tablero eléctrico',           'Tablero antiguo con fusibles, pasar a llaves térmicas.',  'Av. Libertador Bolívar 1500',       -17.370000, -66.160000, now() - interval '12 days', now() - interval '3 days'),   -- 13
 (16, 'Reparar cortocircuito en el patio',   'Salta el térmico cuando llueve.',                         'Quillacollo, Av. Martín Cárdenas',  -17.400000, -66.280000, now() - interval '10 days', now() - interval '2 days'),   -- 14
 (17, 'Fabricar repisas de madera',          '3 repisas flotantes de 1.5 m para la sala.',              'Calle Nataniel Aguirre 200',        -17.392500, -66.163500, now() - interval '8 days',  now() + interval '6 days'),   -- 15
 (18, 'Instalar cerradura digital',          'Cerradura con huella para puerta de madera.',             'Av. Salamanca 330, Cochabamba',     -17.384500, -66.153000, now() - interval '6 days',  now() + interval '7 days'),   -- 16
 (9,  'Destape de cañería de lavandería',    'El desagüe se tapa cada semana.',                         'Av. Aniceto Arce 900, Cochabamba',  -17.379000, -66.150000, now() - interval '4 days',  now() + interval '5 days'),   -- 17
 (20, 'Construir muro divisorio',            'Muro de ladrillo de 3 m de largo en el patio.',           'Sacaba, Av. Chapare 77',            -17.400000, -66.040000, now() - interval '3 days',  now() + interval '15 days'),  -- 18
 (19, 'Reparar mesa de comedor',             'Una pata floja y barniz desgastado.',                     'Calle Antezana 410, Cochabamba',    -17.393500, -66.150000, now() - interval '9 days',  now() + interval '4 days'),   -- 19
 (10, 'Revocar pared de patio',              'Pared de 10 m2 con humedad.',                             'Cala Cala, Av. Uyuni 19',           -17.363000, -66.155000, now() - interval '2 days',  now() + interval '10 days');  -- 20

INSERT INTO categoria_trabajo (id_categoria, id_trabajo) VALUES
    (3, 1), (2, 1), (5, 2), (4, 3), (8, 4), (7, 5), (1, 6), (2, 6), (2, 7), (4, 8),
    (4, 9), (1, 10), (6, 10), (8, 11), (7, 12), (2, 13), (2, 14), (3, 15), (5, 16),
    (1, 17), (6, 18), (3, 19), (6, 20);

INSERT INTO documento_trabajo (id_trabajo, tipo_documento, archivo_url) VALUES
    (1,  'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_1_antes.jpg'),
    (2,  'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_2_antes.jpg'),
    (4,  'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_4_antes.jpg'),
    (6,  'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_6_antes.jpg'),
    (9,  'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_9_antes.jpg'),
    (12, 'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_12_antes.jpg'),
    (13, 'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_13_antes.jpg'),
    (17, 'foto_antes',   'https://storage.ejemplo.com/trabajos/trabajo_17_antes.jpg'),
    (1,  'foto_despues', 'https://storage.ejemplo.com/trabajos/trabajo_1_despues.jpg'),
    (6,  'foto_despues', 'https://storage.ejemplo.com/trabajos/trabajo_6_despues.jpg'),
    (12, 'foto_despues', 'https://storage.ejemplo.com/trabajos/trabajo_12_despues.jpg');

-- ---------- 6. PROPUESTAS ----------
-- (trabajo, reparador, precio_total, costo_visita, materiales_incluidos, detalle_materiales)
-- Todas entran 'pendiente'; el trigger valida que el reparador esté aprobado y el trabajo abierto.
INSERT INTO propuesta (id_trabajo, id_reparador, precio_total, costo_visita, materiales_incluidos, detalle_materiales) VALUES
    -- ganadoras de los trabajos 1 a 16
    (1,  13, 120,  0, false, NULL),
    (2,  15,  80,  0, true,  'Chapa de seguridad estándar'),
    (3,  22, 450, 30, true,  'Pintura látex 4 galones'),
    (4,  18, 150, 20, false, NULL),
    (5,  25, 200,  0, true,  'Gas refrigerante R410A'),
    (6,  11,  90,  0, true,  'Sellos y teflón'),
    (7,  28, 180, 20, true,  'Cable, tomacorrientes y canaletas'),
    (8,  30, 600, 50, false, NULL),
    (9,  14, 300, 30, true,  'Pintura y rodillos'),
    (10, 19, 110,  0, false, NULL),
    (11, 26, 250, 30, false, NULL),
    (12, 17, 700, 50, true,  'Soporte, tubería y cableado'),
    (13, 12, 350,  0, true,  'Llaves térmicas y tablero'),
    (14, 20, 130, 20, false, NULL),
    (15, 21, 400,  0, true,  'Madera de cedro y herrajes'),
    (16, 23, 500,  0, false, NULL),
    -- competidoras que serán rechazadas automáticamente al aceptar la ganadora
    (1,  21, 140,  0, false, NULL),
    (3,  14, 500, 30, true,  'Pintura económica'),
    (6,  19, 110, 10, false, NULL),
    (8,  14, 650, 50, false, NULL),
    -- trabajos aún abiertos (17, 18, 20): ofertas pendientes
    (17, 11, 100, 10, false, NULL),
    (17, 19,  90,  0, false, NULL),
    (18, 13, 900, 40, true,  'Ladrillo, cemento y arena'),
    (18, 21, 850, 40, true,  'Ladrillo y cemento'),
    (20, 13, 300,  0, true,  'Impermeabilizante y cemento'),
    (20, 21, 280,  0, false, NULL),
    -- trabajo 19 (se cancelará): oferta que será retirada
    (19, 13, 160,  0, false, NULL);

-- Retirar la oferta del trabajo 19 y cancelar el trabajo
UPDATE propuesta SET estado = 'retirada' WHERE id_trabajo = 19 AND id_reparador = 13;
UPDATE trabajo   SET estado_publicacion = 'cancelado' WHERE id_trabajo = 19;

-- Aceptar las ganadoras: el trigger cierra el trabajo y rechaza las demás pendientes
UPDATE propuesta SET estado = 'aceptada'
WHERE (id_trabajo, id_reparador) IN (
    (1,13),(2,15),(3,22),(4,18),(5,25),(6,11),(7,28),(8,30),
    (9,14),(10,19),(11,26),(12,17),(13,12),(14,20),(15,21),(16,23));

-- ---------- 7. VISITAS ----------
-- Visitas de los 16 trabajos adjudicados (1-14 realizadas, 15-16 programadas)
INSERT INTO visita (id_propuesta, fecha_inicio, fecha_fin, estado)
SELECT p.id_propuesta,
       t.fecha_preferida - interval '1 day',
       t.fecha_preferida - interval '1 day' + interval '1 hour',
       (CASE WHEN t.id_trabajo <= 14 THEN 'realizada' ELSE 'programada' END)::estado_visita_enum
FROM propuesta p JOIN trabajo t ON t.id_trabajo = p.id_trabajo
WHERE p.estado = 'aceptada';

-- Una visita pendiente para una oferta del trabajo 17 (aún abierto)
INSERT INTO visita (id_propuesta, fecha_inicio, fecha_fin, estado)
SELECT p.id_propuesta, now() + interval '2 days', now() + interval '2 days 1 hour', 'programada'
FROM propuesta p WHERE p.id_trabajo = 17 AND p.id_reparador = 11;

-- ---------- 8. SERVICIOS ----------
INSERT INTO servicio (id_propuesta)
SELECT id_propuesta FROM propuesta WHERE estado = 'aceptada' ORDER BY id_trabajo;

-- Avance: 1-14 en progreso -> 1-12 completados (15-16 quedan 'programado')
UPDATE servicio s SET estado = 'en_progreso'
FROM propuesta p WHERE p.id_propuesta = s.id_propuesta AND p.id_trabajo BETWEEN 1 AND 14;

UPDATE servicio s
SET estado = 'completado',
    fecha_finalizacion = now() - make_interval(days => 40 - p.id_trabajo * 3)
FROM propuesta p WHERE p.id_propuesta = s.id_propuesta AND p.id_trabajo BETWEEN 1 AND 12;

-- ---------- 9. INCREMENTOS DE PRESUPUESTO ----------
-- (trabajo, nuevo total, motivo, estado, solicitud, respuesta)
INSERT INTO incremento_presupuesto (id_servicio, monto_nuevo, motivo, estado_aprobacion, fecha_solicitud, fecha_respuesta)
SELECT s.id_servicio, v.monto, v.motivo, v.estado::estado_aprobacion_enum, v.solicitud, v.respuesta
FROM (VALUES
    (3,  520, 'Se encontró humedad en una pared y requiere sellador.', 'aprobado',  now() - interval '33 days', now() - interval '32 days'),
    (8,  700, 'Daño en el revoque de la fachada.',                     'rechazado', now() - interval '18 days', now() - interval '17 days'),
    (13, 420, 'Hay que cambiar el cable de acometida.',                'pendiente', now() - interval '1 day',   NULL::timestamptz)
) AS v(trabajo, monto, motivo, estado, solicitud, respuesta)
JOIN propuesta p ON p.id_trabajo = v.trabajo AND p.estado = 'aceptada'
JOIN servicio  s ON s.id_propuesta = p.id_propuesta;

-- ---------- 10. PAGOS (servicios completados) ----------
-- Monto = último incremento aprobado, o el precio de la propuesta.
-- Servicio 11: pago declarado y aún sin confirmar. El resto: confirmado.
INSERT INTO pago (id_servicio, monto, metodo, comprobante_url, estado, fecha_declaracion, fecha_confirmacion)
SELECT s.id_servicio,
       COALESCE((SELECT i.monto_nuevo FROM incremento_presupuesto i
                  WHERE i.id_servicio = s.id_servicio AND i.estado_aprobacion = 'aprobado'
                  ORDER BY i.fecha_respuesta DESC LIMIT 1), p.precio_total),
       (CASE s.id_servicio % 3 WHEN 0 THEN 'efectivo' WHEN 1 THEN 'qr' ELSE 'transferencia' END)::metodo_pago_enum,
       CASE WHEN s.id_servicio % 3 = 0 THEN NULL
            ELSE 'https://storage.ejemplo.com/comprobantes/pago_servicio_' || s.id_servicio || '.jpg' END,
       (CASE WHEN s.id_servicio = 11 THEN 'declarado' ELSE 'confirmado' END)::estado_pago_enum,
       s.fecha_finalizacion,
       CASE WHEN s.id_servicio = 11 THEN NULL ELSE s.fecha_finalizacion + interval '1 day' END
FROM servicio s JOIN propuesta p ON p.id_propuesta = s.id_propuesta
WHERE s.estado = 'completado';

-- ---------- 11. CALIFICACIONES (10 con comentario) ----------
-- (trabajo, evaluador, evaluado, puntuación, comentario): entre cliente y reparador del servicio
INSERT INTO calificacion (id_servicio, id_evaluador, id_evaluado, puntuacion, comentario)
SELECT s.id_servicio, v.evaluador, v.evaluado, v.puntuacion, v.comentario
FROM (VALUES
    (1, 1,  13, 5, 'Excelente trabajo, muy puntual y ordenado.'),
    (1, 13, 1,  5, 'Cliente amable y con buena comunicación.'),
    (2, 2,  15, 4, 'Buen trabajo, llegó un poco tarde.'),
    (2, 15, 2,  5, 'Pago puntual y todo muy claro.'),
    (3, 3,  22, 5, 'Dejó la sala impecable.'),
    (3, 22, 3,  4, 'Cliente cordial, cambió el color a último momento.'),
    (4, 4,  18, 3, 'Resolvió el problema pero tardó más de lo acordado.'),
    (4, 18, 4,  5, 'Excelente cliente, muy recomendado.'),
    (5, 5,  25, 5, 'Muy profesional y explicó el mantenimiento.'),
    (6, 6,  11, 4, 'Solucionó la fuga rápidamente.')
) AS v(trabajo, evaluador, evaluado, puntuacion, comentario)
JOIN propuesta p ON p.id_trabajo = v.trabajo AND p.estado = 'aceptada'
JOIN servicio  s ON s.id_propuesta = p.id_propuesta;

-- ---------- 12. RECLAMOS Y ACCIONES DE SOPORTE (soporte = usuario 1, admin) ----------
INSERT INTO reclamo (id_trabajo, id_usuario, motivo, estado) VALUES
    (4,  4,  'La lavadora volvió a fallar a los pocos días de la reparación.', 'resuelto'),
    (8,  8,  'La pintura de la fachada se está descascarando.',                'en_revision'),
    (13, 15, 'El reparador no llegó a la hora acordada.',                      'abierto');

INSERT INTO reclamo_accion (id_reclamo, id_soporte, descripcion) VALUES
    (1, 1, 'Se contactó al reparador, aceptó hacer una revisión sin costo.'),
    (1, 1, 'Revisión realizada, el problema quedó solucionado.'),
    (2, 1, 'Se pidieron fotos actuales al cliente y al reparador.');

-- ---------- 13. VERIFICACIÓN ----------
SELECT
  (SELECT count(*) FROM usuario_rol WHERE id_rol = 1)                         AS clientes,
  (SELECT count(*) FROM usuario_rol WHERE id_rol = 2)                         AS reparadores,
  (SELECT count(*) FROM usuario_rol a JOIN usuario_rol b
         ON a.id_usuario = b.id_usuario AND a.id_rol = 1 AND b.id_rol = 2)    AS usuarios_ambos,
  (SELECT count(*) FROM rol)                                                  AS roles,
  (SELECT count(*) FROM trabajo)                                              AS trabajos,
  (SELECT count(*) FROM propuesta)                                            AS propuestas,
  (SELECT count(*) FROM servicio)                                             AS servicios,
  (SELECT count(*) FROM pago)                                                 AS pagos,
  (SELECT count(*) FROM calificacion WHERE comentario IS NOT NULL)            AS comentarios,
  (SELECT count(*) FROM reclamo)                                              AS reclamos,
  (SELECT count(*) FROM evento_trabajo)                                       AS eventos_bitacora;
