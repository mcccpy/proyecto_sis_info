const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
process.env.JWT_SECRET ||= 'integration-test-secret-with-more-than-32-bytes';
const { AppModule } = require('../dist/app.module.js');
const { db } = require('../dist/prisma/db.js');

const habilitadas = process.env.RUN_DB_INTEGRATION === '1';

test(
  'API + PostgreSQL: alta de cliente, segundo rol reparador, cambio de modo y control administrativo',
  { skip: !habilitadas },
  async () => {
    const sufijo = randomUUID();
    let aplicacion;
    let idUsuario;
    let idClienteDirecto;
    let tokenActivo;
    let tokenCliente;
    let tokenReparador;
    let tokenAdministrador;
    const idsTrabajo = [];
    const idsUsuario = [];
    const idsServicio = [];
    const idsRol = [];
    const idsCategoriaAdmin = [];

    try {
      aplicacion = await NestFactory.create(AppModule, { logger: ['error'] });
      aplicacion.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await aplicacion.listen(0, '127.0.0.1');

      const puerto = aplicacion.getHttpServer().address().port;
      const base = `http://127.0.0.1:${puerto}`;
      const solicitar = async (ruta, opciones = {}) => {
        const { token, ...opcionesFetch } = opciones;
        const tokenPeticion = token === false ? undefined : (token ?? tokenActivo);
        const respuesta = await fetch(`${base}${ruta}`, {
          ...opcionesFetch,
          headers: {
            'content-type': 'application/json',
            ...(tokenPeticion
              ? { authorization: `Bearer ${tokenPeticion}` }
              : {}),
            ...opciones.headers,
          },
          body: opciones.body ? JSON.stringify(opciones.body) : undefined,
        });
        const cuerpo = await respuesta.json();
        return { estado: respuesta.status, cuerpo };
      };

      const categorias = await solicitar('/categoria');
      assert.equal(categorias.estado, 200, JSON.stringify(categorias.cuerpo));
      assert.ok(categorias.cuerpo.length > 0, 'se necesita al menos una categoría');
      const categoria = categorias.cuerpo[0];

      const alta = await solicitar('/usuario/registro', {
        method: 'POST',
        body: {
          nombre: 'Cuenta de integración',
          email: `integracion-${sufijo}@example.test`,
          telefono: `9${sufijo.replaceAll('-', '').slice(0, 7)}`,
          password: 'ClaveTemporal123',
          rol_inicial: 'cliente',
        },
      });
      assert.equal(alta.estado, 201, JSON.stringify(alta.cuerpo));
      idUsuario = alta.cuerpo.id_usuario;
      idsUsuario.push(idUsuario);
      assert.deepEqual(alta.cuerpo.roles_disponibles, ['cliente']);
      assert.equal('passwordHash' in alta.cuerpo, false);

      const login = await solicitar('/auth/login', {
        method: 'POST',
        body: {
          email: `INTEGRACION-${sufijo}@EXAMPLE.TEST`,
          password: 'ClaveTemporal123',
        },
      });
      assert.equal(login.estado, 201, JSON.stringify(login.cuerpo));
      assert.equal(login.cuerpo.token_type, 'Bearer');
      assert.ok(login.cuerpo.token);
      assert.deepEqual(login.cuerpo.usuario.roles_disponibles, ['cliente']);
      tokenCliente = login.cuerpo.token;
      tokenActivo = tokenCliente;

      const loginInvalido = await solicitar('/auth/login', {
        method: 'POST',
        body: {
          email: `integracion-${sufijo}@example.test`,
          password: 'incorrecta',
        },
      });
      assert.equal(loginInvalido.estado, 401);

      const perfilSinToken = await solicitar('/auth/perfil', { token: false });
      assert.equal(perfilSinToken.estado, 401);
      const perfilConToken = await solicitar('/auth/perfil', {
        token: login.cuerpo.token,
      });
      assert.equal(perfilConToken.estado, 200);
      assert.equal(perfilConToken.cuerpo.id_usuario, idUsuario);
      assert.equal('passwordHash' in perfilConToken.cuerpo, false);
      const [jwtHeader, jwtPayload, jwtFirma] = login.cuerpo.token.split('.');
      const firmaAlterada = `${jwtFirma[0] === 'A' ? 'B' : 'A'}${jwtFirma.slice(1)}`;
      const tokenAlterado = await solicitar('/auth/perfil', {
        token: `${jwtHeader}.${jwtPayload}.${firmaAlterada}`,
      });
      assert.equal(tokenAlterado.estado, 401);
      const rutaPrivadaSinToken = await solicitar('/trabajo', { token: false });
      assert.equal(rutaPrivadaSinToken.estado, 401);

      const altaDuplicada = await solicitar('/usuario/registro', {
        method: 'POST',
        body: {
          nombre: 'Cuenta duplicada',
          email: `integracion-${sufijo}@example.test`,
          telefono: `8${sufijo.replaceAll('-', '').slice(0, 7)}`,
          password: 'ClaveTemporal123',
          rol_inicial: 'cliente',
        },
      });
      assert.equal(altaDuplicada.estado, 409);

      const cambioNoHabilitado = await solicitar(
        `/usuario/${idUsuario}/cambiar-rol`,
        { method: 'PATCH', body: { rol_objetivo: 'reparador' } },
      );
      assert.equal(cambioNoHabilitado.estado, 403);

      const agregarReparador = await solicitar(
        `/usuario/${idUsuario}/agregar-rol`,
        {
          method: 'POST',
          body: {
            nuevo_rol: 'reparador',
            perfil_reparador: {
              experiencia_anios: 2,
              categorias: [categoria.idCategoria],
              zonas: [
                {
                  etiqueta: `Zona de integración ${sufijo.slice(0, 8)}`,
                  latitud: -16.5,
                  longitud: -68.15,
                  radio_good: 1000,
                  radio_medio: 5000,
                  radio_bad: 12000,
                },
              ],
              disponibilidades: [
                { dia_semana: 1, hora_inicio: '09:00', hora_fin: '17:00' },
              ],
            },
            documentos: [
              {
                tipo_documento: 'identidad',
                ubucacion_archivo: `test://${sufijo}/documento`,
              },
            ],
          },
        },
      );
      assert.equal(agregarReparador.estado, 201, JSON.stringify(agregarReparador.cuerpo));
      assert.deepEqual(agregarReparador.cuerpo.roles_disponibles.sort(), [
        'cliente',
        'reparador',
      ]);
      assert.equal(agregarReparador.cuerpo.perfil_trabajador.estadoAprobacion, 'pendiente');
      assert.equal(agregarReparador.cuerpo.documentos.length, 1);

      const rolAdministrador = await db.orm.public.Rol.include(
        'usuarioRols',
        (asignaciones) => asignaciones.select('idUsuario'),
      )
        .where({ nombre: 'administrador' })
        .first();
      const idAdmin = rolAdministrador?.usuarioRols[0]?.idUsuario;
      assert.ok(idAdmin, 'la base debe tener al menos un administrador');
      const { JwtTokenService } = require('../dist/modules/auth/jwt-token.service.js');
      tokenAdministrador = aplicacion
        .get(JwtTokenService)
        .crearToken(idAdmin, 'administrador');
      tokenActivo = tokenAdministrador;

      const altaReparadorInicial = await solicitar('/usuario/registro', {
        method: 'POST',
        body: {
          nombre: 'Reparador inicial de integracion',
          email: `reparador-inicial-${sufijo}@example.test`,
          telefono: `6${sufijo.replaceAll('-', '').slice(0, 7)}`,
          password: 'ClaveTemporal123',
          rol_inicial: 'reparador',
          perfil_reparador: {
            experiencia_anios: 1,
            categorias: [categoria.idCategoria],
            zonas: [
              {
                etiqueta: `Zona reparador inicial ${sufijo.slice(0, 8)}`,
                latitud: -16.5,
                longitud: -68.15,
                radio_good: 1000,
                radio_medio: 5000,
                radio_bad: 12000,
              },
            ],
            disponibilidades: [
              { dia_semana: 2, hora_inicio: '09:00', hora_fin: '17:00' },
            ],
          },
          documentos: [
            {
              tipo_documento: 'identidad',
              ubucacion_archivo: `test://${sufijo}/reparador-inicial`,
            },
          ],
        },
      });
      assert.equal(altaReparadorInicial.estado, 201, JSON.stringify(altaReparadorInicial.cuerpo));
      const idReparadorInicial = altaReparadorInicial.cuerpo.id_usuario;
      idsUsuario.push(idReparadorInicial);
      assert.equal(altaReparadorInicial.cuerpo.perfil_trabajador.estadoAprobacion, 'pendiente');
      const loginReparadorInicial = await solicitar('/auth/login', {
        method: 'POST',
        body: {
          email: `reparador-inicial-${sufijo}@example.test`,
          password: 'ClaveTemporal123',
        },
      });
      assert.equal(loginReparadorInicial.estado, 201);
      const tokenReparadorAjeno = loginReparadorInicial.cuerpo.token;
      const documentoReparadorInicial = altaReparadorInicial.cuerpo.documentos[0];
      const rechazarDocumentoInicial = await solicitar(
        `/usuario/admin/documentos-usuario/${documentoReparadorInicial.idDocumentoUs}/estado`,
        {
          method: 'PATCH',
          body: { id_admin: idAdmin, estado: 'rechazado' },
        },
      );
      assert.equal(rechazarDocumentoInicial.estado, 200);
      const rechazarPerfilInicial = await solicitar(
        `/usuario/admin/reparadores/${idReparadorInicial}/estado`,
        {
          method: 'PATCH',
          body: { id_admin: idAdmin, estado_aprobacion: 'rechazado' },
        },
      );
      assert.equal(rechazarPerfilInicial.estado, 200);
      assert.equal(rechazarPerfilInicial.cuerpo.estadoAprobacion, 'rechazado');
      const filtroReparadoresRechazados = await solicitar(
        `/usuario/admin/reparadores?id_admin=${idAdmin}&estado_aprobacion=rechazado&busqueda=${encodeURIComponent(`reparador-inicial-${sufijo}`)}`,
      );
      assert.equal(filtroReparadoresRechazados.estado, 200);
      assert.ok(filtroReparadoresRechazados.cuerpo.some((perfil) => perfil.idUsuario === idReparadorInicial));

      const rolNuevo = await solicitar('/usuario/admin/roles', {
        method: 'POST',
        body: { id_admin: idAdmin, nombre: `rol-${sufijo.slice(0, 8)}` },
      });
      assert.equal(rolNuevo.estado, 201);
      idsRol.push(rolNuevo.cuerpo.idRol);
      const asignarRol = await solicitar('/usuario/admin/usuario-rol', {
        method: 'POST',
        body: {
          id_admin: idAdmin,
          id_usuario: idUsuario,
          id_rol: rolNuevo.cuerpo.idRol,
        },
      });
      assert.equal(asignarRol.estado, 201);
      const revocarRol = await solicitar('/usuario/admin/usuario-rol', {
        method: 'DELETE',
        body: {
          id_admin: idAdmin,
          id_usuario: idUsuario,
          id_rol: rolNuevo.cuerpo.idRol,
        },
      });
      assert.equal(revocarRol.estado, 200);
      const eliminarRol = await solicitar(
        `/usuario/admin/roles/${rolNuevo.cuerpo.idRol}?id_admin=${idAdmin}`,
        { method: 'DELETE' },
      );
      assert.equal(eliminarRol.estado, 200);
      idsRol.pop();

      const categoriaAdmin = await solicitar('/categoria/admin', {
        method: 'POST',
        body: { id_admin: idAdmin, nombre: `Categoria test ${sufijo}` },
      });
      assert.equal(categoriaAdmin.estado, 201);
      idsCategoriaAdmin.push(categoriaAdmin.cuerpo.idCategoria);
      const asignarCategoria = await solicitar('/categoria/admin/reparador', {
        method: 'POST',
        body: {
          id_admin: idAdmin,
          id_reparador: idUsuario,
          id_categoria: categoriaAdmin.cuerpo.idCategoria,
        },
      });
      assert.equal(asignarCategoria.estado, 201);
      const quitarCategoria = await solicitar('/categoria/admin/reparador', {
        method: 'DELETE',
        body: {
          id_admin: idAdmin,
          id_reparador: idUsuario,
          id_categoria: categoriaAdmin.cuerpo.idCategoria,
        },
      });
      assert.equal(quitarCategoria.estado, 200);
      const eliminarCategoria = await solicitar(
        `/categoria/admin/${categoriaAdmin.cuerpo.idCategoria}?id_admin=${idAdmin}`,
        { method: 'DELETE' },
      );
      assert.equal(eliminarCategoria.estado, 200);
      idsCategoriaAdmin.pop();

      const idDocumento = agregarReparador.cuerpo.documentos[0].idDocumentoUs;
      const aprobarDocumento = await solicitar(
        `/usuario/admin/documentos-usuario/${idDocumento}/estado`,
        {
          method: 'PATCH',
          body: { id_admin: idAdmin, estado: 'aprobado' },
        },
      );
      assert.equal(aprobarDocumento.estado, 200);
      assert.equal(aprobarDocumento.cuerpo.estado, 'aprobado');

      const aprobarReparador = await solicitar(
        `/usuario/admin/reparadores/${idUsuario}/estado`,
        {
          method: 'PATCH',
          body: { id_admin: idAdmin, estado_aprobacion: 'aprobado' },
        },
      );
      assert.equal(aprobarReparador.estado, 200);
      assert.equal(aprobarReparador.cuerpo.estadoAprobacion, 'aprobado');

      const altaClienteDirecto = await solicitar('/usuario/registro', {
        method: 'POST',
        body: {
          nombre: 'Cliente de integración',
          email: `cliente-integracion-${sufijo}@example.test`,
          telefono: `7${sufijo.replaceAll('-', '').slice(0, 7)}`,
          password: 'ClaveTemporal123',
          rol_inicial: 'cliente',
          documentos: [
            {
              tipo_documento: 'comprobante_cliente',
              ubucacion_archivo: `test://${sufijo}/documento-cliente`,
            },
          ],
        },
      });
      assert.equal(altaClienteDirecto.estado, 201);
      idClienteDirecto = altaClienteDirecto.cuerpo.id_usuario;
      idsUsuario.push(idClienteDirecto);

      const loginClienteDirecto = await solicitar('/auth/login', {
        method: 'POST',
        body: {
          email: `cliente-integracion-${sufijo}@example.test`,
          password: 'ClaveTemporal123',
        },
      });
      assert.equal(loginClienteDirecto.estado, 201);
      const tokenClienteDirecto = loginClienteDirecto.cuerpo.token;

      const documentosClienteAdmin = await solicitar(
        `/usuario/admin/documentos-clientes?id_admin=${idAdmin}&estado=pendiente&busqueda=${encodeURIComponent(`cliente-integracion-${sufijo}`)}`,
        { token: tokenAdministrador },
      );
      assert.equal(documentosClienteAdmin.estado, 200);
      assert.ok(
        documentosClienteAdmin.cuerpo.some(
          (documento) => documento.idUsuario === idClienteDirecto,
        ),
      );

      const agregarRolReparadorClienteDirecto = await solicitar(
        `/usuario/${idClienteDirecto}/agregar-rol`,
        {
          token: tokenClienteDirecto,
          method: 'POST',
          body: {
            nuevo_rol: 'reparador',
            perfil_reparador: {
              experiencia_anios: 3,
              categorias: [categoria.idCategoria],
              zonas: [
                {
                  etiqueta: `Zona cliente reparador ${sufijo.slice(0, 8)}`,
                  latitud: -16.5,
                  longitud: -68.15,
                  radio_good: 1000,
                  radio_medio: 5000,
                  radio_bad: 12000,
                },
              ],
              disponibilidades: [
                { dia_semana: 3, hora_inicio: '08:00', hora_fin: '16:00' },
              ],
            },
            documentos: [
              {
                tipo_documento: 'identidad',
                ubucacion_archivo: `test://${sufijo}/cliente-reparador`,
              },
            ],
          },
        },
      );
      assert.equal(agregarRolReparadorClienteDirecto.estado, 201);
      const documentoSegundoReparador =
        agregarRolReparadorClienteDirecto.cuerpo.documentos[0];
      const aprobarDocumentoSegundoReparador = await solicitar(
        `/usuario/admin/documentos-usuario/${documentoSegundoReparador.idDocumentoUs}/estado`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: { id_admin: idAdmin, estado: 'aprobado' },
        },
      );
      assert.equal(aprobarDocumentoSegundoReparador.estado, 200);
      const aprobarPerfilSegundoReparador = await solicitar(
        `/usuario/admin/reparadores/${idClienteDirecto}/estado`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: { id_admin: idAdmin, estado_aprobacion: 'aprobado' },
        },
      );
      assert.equal(aprobarPerfilSegundoReparador.estado, 200);
      const cambiarClienteAReparador = await solicitar(
        `/usuario/${idClienteDirecto}/cambiar-rol`,
        {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: { rol_objetivo: 'reparador' },
        },
      );
      assert.equal(cambiarClienteAReparador.estado, 200);
      const tokenReparadorDirecto = cambiarClienteAReparador.cuerpo.token;

      tokenActivo = tokenCliente;
      const cambioHabilitado = await solicitar(
        `/usuario/${idUsuario}/cambiar-rol`,
        { method: 'PATCH', body: { rol_objetivo: 'reparador' } },
      );
      assert.equal(cambioHabilitado.estado, 200);
      assert.equal(cambioHabilitado.cuerpo.rol_activo, 'reparador');
      assert.ok(cambioHabilitado.cuerpo.token);
      tokenReparador = cambioHabilitado.cuerpo.token;
      tokenActivo = tokenReparador;

      const fechaPreferida = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const intentoSuplantacion = await solicitar('/trabajo/abierto', {
        token: tokenCliente,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          direccion: 'No debe guardarse',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Suplantación ${sufijo.slice(0, 8)}`,
          descripcion: 'El actor del cuerpo no coincide con el token.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(intentoSuplantacion.estado, 403);

      const trabajoAbierto = await solicitar('/trabajo/abierto', {
        token: tokenCliente,
        method: 'POST',
        body: {
          id_cliente: idUsuario,
          direccion: 'Dirección de integración',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Trabajo público ${sufijo.slice(0, 8)}`,
          descripcion: 'Solicitud pública temporal para comprobar el feed.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
          documentos: [
            {
              tipo_documento: 'foto_prueba',
              ubucacion_archivo: `test://${sufijo}/foto`,
            },
          ],
        },
      });
      assert.equal(trabajoAbierto.estado, 201, JSON.stringify(trabajoAbierto.cuerpo));
      idsTrabajo.push(trabajoAbierto.cuerpo.idTrabajo);

      const categoriaTrabajoAdmin = await solicitar('/categoria/admin', {
        token: tokenAdministrador,
        method: 'POST',
        body: { id_admin: idAdmin, nombre: `Categoria trabajo ${sufijo}` },
      });
      assert.equal(categoriaTrabajoAdmin.estado, 201);
      idsCategoriaAdmin.push(categoriaTrabajoAdmin.cuerpo.idCategoria);
      const asignarCategoriaTrabajo = await solicitar('/categoria/admin/trabajo', {
        token: tokenAdministrador,
        method: 'POST',
        body: {
          id_admin: idAdmin,
          id_trabajo: trabajoAbierto.cuerpo.idTrabajo,
          id_categoria: categoriaTrabajoAdmin.cuerpo.idCategoria,
        },
      });
      assert.equal(asignarCategoriaTrabajo.estado, 201);
      const quitarCategoriaTrabajo = await solicitar('/categoria/admin/trabajo', {
        token: tokenAdministrador,
        method: 'DELETE',
        body: {
          id_admin: idAdmin,
          id_trabajo: trabajoAbierto.cuerpo.idTrabajo,
          id_categoria: categoriaTrabajoAdmin.cuerpo.idCategoria,
        },
      });
      assert.equal(quitarCategoriaTrabajo.estado, 200);

      const documentosAdmin = await solicitar(
        `/trabajo/admin/documentos?id_admin=${idAdmin}&busqueda=${encodeURIComponent(trabajoAbierto.cuerpo.titulo)}`,
        { token: tokenAdministrador },
      );
      assert.equal(documentosAdmin.estado, 200, JSON.stringify(documentosAdmin.cuerpo));
      assert.ok(documentosAdmin.cuerpo.length > 0);

      const feed = await solicitar(`/trabajo/reparador/${idUsuario}/feed`, {
        token: tokenReparador,
      });
      assert.equal(feed.estado, 200, JSON.stringify(feed.cuerpo));
      const trabajoEnZonaVerde = feed.cuerpo.trabajos_disponibles.find(
        (trabajo) => trabajo.idTrabajo === trabajoAbierto.cuerpo.idTrabajo,
      );
      assert.equal(trabajoEnZonaVerde?.anillo_cobertura, 'VERDE');

      const dashboardCliente = await solicitar(
        `/trabajo/cliente/${idUsuario}/dashboard`,
        { token: tokenCliente },
      );
      assert.equal(dashboardCliente.estado, 200);
      assert.ok(
        dashboardCliente.cuerpo.some(
          (trabajo) => trabajo.id === trabajoAbierto.cuerpo.idTrabajo,
        ),
      );

      const solicitudDirectaRechazada = await solicitar('/trabajo/directo', {
        token: tokenCliente,
        method: 'POST',
        body: {
          id_cliente: idUsuario,
          id_reparador: idUsuario,
          direccion: 'Dirección directa de integración',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Directo inválido ${sufijo.slice(0, 8)}`,
          descripcion: 'La cuenta no debe poder solicitarse a sí misma.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(solicitudDirectaRechazada.estado, 400);

      const solicitudDirecta = await solicitar('/trabajo/directo', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          id_reparador: idUsuario,
          direccion: 'Dirección directa de integración',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Directo de prueba ${sufijo.slice(0, 8)}`,
          descripcion: 'Solicitud directa temporal para comprobar la propuesta inicial.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(solicitudDirecta.estado, 201, JSON.stringify(solicitudDirecta.cuerpo));
      idsTrabajo.push(solicitudDirecta.cuerpo.idTrabajo);
      assert.equal(solicitudDirecta.cuerpo.propuestas.length, 1);
      assert.equal(solicitudDirecta.cuerpo.propuestas[0].estado, 'pendiente');
      assert.equal(Number(solicitudDirecta.cuerpo.propuestas[0].precioTotal), 0);

      const trabajoDirectoRechazado = await solicitar('/trabajo/directo', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          id_reparador: idUsuario,
          direccion: 'Dirección para probar el trigger de rechazo',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Directo rechazado ${sufijo.slice(0, 8)}`,
          descripcion: 'La republicación debe realizarla el trigger de PostgreSQL.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(trabajoDirectoRechazado.estado, 201);
      idsTrabajo.push(trabajoDirectoRechazado.cuerpo.idTrabajo);
      const idPropuestaDirectaRechazada =
        trabajoDirectoRechazado.cuerpo.propuestas[0].idPropuesta;
      const rechazarDirecta = await solicitar(
        `/propuesta/${idPropuestaDirectaRechazada}/rechazar`,
        {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: { id_cliente: idClienteDirecto },
        },
      );
      assert.equal(rechazarDirecta.estado, 200);
      assert.equal(rechazarDirecta.cuerpo.estado, 'rechazada');
      const trabajoRepublicadoPorTrigger = await db.orm.public.Trabajo
        .where({ idTrabajo: trabajoDirectoRechazado.cuerpo.idTrabajo })
        .first();
      assert.equal(trabajoRepublicadoPorTrigger.tipoSolicitud, 'abierta');
      assert.equal(trabajoRepublicadoPorTrigger.estadoPublicacion, 'abierto');
      const trabajoRechazadoExplorado = await solicitar(
        `/trabajo/portal-reparador/${idClienteDirecto}/explorar?latitud=-16.5&longitud=-68.15`,
        { token: tokenReparadorDirecto },
      );
      assert.ok(
        trabajoRechazadoExplorado.cuerpo.some(
          (trabajo) => trabajo.idTrabajo === trabajoDirectoRechazado.cuerpo.idTrabajo,
        ),
        'el trabajo rechazado debe aparecer en la exploración pública de otro reparador',
      );
      const postularseATrabajo = await solicitar('/propuesta/postular', {
        token: tokenReparadorDirecto,
        method: 'POST',
        body: {
          id_trabajo: trabajoAbierto.cuerpo.idTrabajo,
          id_reparador: idClienteDirecto,
          precio_total: 225,
          costo_visita: 20,
          materiales_incluidos: false,
          detalle_materiales: 'Materiales a cotizar tras revisar la publicación.',
        },
      });
      assert.equal(postularseATrabajo.estado, 201, JSON.stringify(postularseATrabajo.cuerpo));
      const misPostulaciones = await solicitar(
        `/trabajo/portal-reparador/${idClienteDirecto}/postulaciones`,
        { token: tokenReparadorDirecto },
      );
      assert.ok(
        misPostulaciones.cuerpo.some(
          (propuesta) => propuesta.idPropuesta === postularseATrabajo.cuerpo.idPropuesta,
        ),
      );

      const coordenadasPorAnillo = [
        { desplazamiento_latitud: 0.005, anillo: 'VERDE' },
        { desplazamiento_latitud: 0.02, anillo: 'AMARILLO' },
        { desplazamiento_latitud: 0.07, anillo: 'ROJO' },
      ];
      for (const { desplazamiento_latitud, anillo } of coordenadasPorAnillo) {
        const tecnicosPorAnillo = await solicitar(
          `/trabajo/tecnicos-directos?id_categoria=${categoria.idCategoria}&latitud=${-16.5 + desplazamiento_latitud}&longitud=-68.15`,
        );
        assert.equal(tecnicosPorAnillo.estado, 200);
        const tecnicoEncontrado = tecnicosPorAnillo.cuerpo.find(
          (tecnico) => tecnico.id_reparador === idUsuario,
        );
        assert.equal(tecnicoEncontrado?.anillo_cobertura, anillo);
      }
      const fueraDeCobertura = await solicitar(
        `/trabajo/tecnicos-directos?id_categoria=${categoria.idCategoria}&latitud=-16.62&longitud=-68.15`,
      );
      assert.equal(fueraDeCobertura.estado, 200);
      const tecnicoFueraDeCobertura = fueraDeCobertura.cuerpo.find(
        (tecnico) => tecnico.id_reparador === idUsuario,
      );
      assert.equal(tecnicoFueraDeCobertura?.anillo_cobertura, 'FUERA_DE_ZONA');
      const solicitudDirectaFueraDeZona = await solicitar('/trabajo/directo', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          id_reparador: idUsuario,
          direccion: 'Dirección fuera del anillo rojo.',
          latitud: -16.62,
          longitud: -68.15,
          titulo: `Directo fuera de zona ${sufijo.slice(0, 8)}`,
          descripcion: 'La cobertura se presenta como prioridad, pero el cliente puede solicitar.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(solicitudDirectaFueraDeZona.estado, 201, JSON.stringify(solicitudDirectaFueraDeZona.cuerpo));
      idsTrabajo.push(solicitudDirectaFueraDeZona.cuerpo.idTrabajo);

      const evidenciaTecnica = await solicitar(
        `/trabajo/${solicitudDirecta.cuerpo.idTrabajo}/documentos`,
        {
          token: tokenReparador,
          method: 'POST',
          body: {
            id_usuario: idUsuario,
            tipo_documento: 'evidencia_tecnica',
            archivo_url: `test://${sufijo}/evidencia-tecnica`,
          },
        },
      );
      assert.equal(evidenciaTecnica.estado, 201);
      const documentosCliente = await solicitar(
        `/trabajo/${solicitudDirecta.cuerpo.idTrabajo}/documentos?id_usuario=${idClienteDirecto}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(documentosCliente.estado, 200);
      assert.ok(
        documentosCliente.cuerpo.some(
          (documento) => documento.tipoDocumento === 'evidencia_tecnica',
        ),
      );
      const documentosUsuarioAjeno = await solicitar(
        `/trabajo/${solicitudDirecta.cuerpo.idTrabajo}/documentos?id_usuario=${idReparadorInicial}`,
        { token: tokenReparadorAjeno },
      );
      assert.equal(documentosUsuarioAjeno.estado, 403);

      const compromisos = await solicitar(
        `/trabajo/portal-reparador/${idUsuario}/compromisos`,
        { token: tokenReparador },
      );
      assert.equal(compromisos.estado, 200);
      assert.ok(
        compromisos.cuerpo.solicitudes_directas.some(
          (propuesta) =>
            propuesta.idTrabajo === solicitudDirecta.cuerpo.idTrabajo,
        ),
      );

      const idPropuesta = solicitudDirecta.cuerpo.propuestas[0].idPropuesta;
      const cotizacion = await solicitar(`/propuesta/${idPropuesta}/cotizar`, {
        token: tokenReparador,
        method: 'PATCH',
        body: {
          id_reparador: idUsuario,
          precio_total: 250,
          costo_visita: 0,
          materiales_incluidos: true,
        },
      });
      assert.equal(cotizacion.estado, 200);
      assert.equal(Number(cotizacion.cuerpo.precioTotal), 250);

      const aceptarPropuesta = await solicitar(
        `/propuesta/${idPropuesta}/aceptar`,
        { token: tokenClienteDirecto, method: 'PATCH', body: { id_cliente: idClienteDirecto } },
      );
      assert.equal(aceptarPropuesta.estado, 200, JSON.stringify(aceptarPropuesta.cuerpo));
      const servicio = await db.orm.public.Servicio.where({ idPropuesta }).first();
      assert.ok(servicio, 'aceptar la propuesta debe crear un servicio');
      const idServicio = servicio.idServicio;
      idsServicio.push(idServicio);
      const propuestaAjena = await solicitar(`/propuesta/${idPropuesta}`, {
        token: tokenReparadorAjeno,
      });
      assert.equal(propuestaAjena.estado, 403);
      const servicioAjeno = await solicitar(`/servicio/${idServicio}`, {
        token: tokenReparadorAjeno,
      });
      assert.equal(servicioAjeno.estado, 403);
      const trabajoAjeno = await solicitar(
        `/trabajo/${solicitudDirecta.cuerpo.idTrabajo}`,
        { token: tokenReparadorAjeno },
      );
      assert.equal(trabajoAjeno.estado, 403);
      const compromisosConServicio = await solicitar(
        `/trabajo/portal-reparador/${idUsuario}/compromisos`,
        { token: tokenReparador },
      );
      assert.ok(
        compromisosConServicio.cuerpo.programados.some(
          (item) => item.idServicio === idServicio,
        ),
      );

      const fechaVisitaInicio = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const fechaVisitaFin = new Date(fechaVisitaInicio.getTime() + 60 * 60 * 1000);
      const visita = await solicitar(`/visita/servicio/${idServicio}`, {
        token: tokenReparador,
        method: 'POST',
        body: {
          id_usuario: idUsuario,
          fecha_inicio: fechaVisitaInicio.toISOString(),
          fecha_fin: fechaVisitaFin.toISOString(),
        },
      });
      assert.equal(visita.estado, 201, JSON.stringify(visita.cuerpo));
      const visitaAjena = await solicitar(`/visita/${visita.cuerpo.idVisita}`, {
        token: tokenReparadorAjeno,
      });
      assert.equal(visitaAjena.estado, 403);
      const visitaCancelableInicio = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      const visitaCancelableFin = new Date(visitaCancelableInicio.getTime() + 60 * 60 * 1000);
      const visitaCancelable = await solicitar(`/visita/servicio/${idServicio}`, {
        token: tokenReparador,
        method: 'POST',
        body: {
          id_usuario: idUsuario,
          fecha_inicio: visitaCancelableInicio.toISOString(),
          fecha_fin: visitaCancelableFin.toISOString(),
        },
      });
      assert.equal(visitaCancelable.estado, 201);
      const intentoCancelarComoReparador = await solicitar(
        `/visita/${visitaCancelable.cuerpo.idVisita}/estado`,
        {
          token: tokenReparador,
          method: 'PATCH',
          body: { id_usuario: idUsuario, estado: 'cancelada' },
        },
      );
      assert.equal(intentoCancelarComoReparador.estado, 403);
      const cancelarVisitaComoCliente = await solicitar(
        `/visita/${visitaCancelable.cuerpo.idVisita}/estado`,
        {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: { id_usuario: idClienteDirecto, estado: 'cancelada' },
        },
      );
      assert.equal(cancelarVisitaComoCliente.estado, 200);
      assert.equal(cancelarVisitaComoCliente.cuerpo.estado, 'cancelada');
      const visitaRealizada = await solicitar(
        `/visita/${visita.cuerpo.idVisita}/realizada`,
        { token: tokenReparador, method: 'PATCH', body: { id_reparador: idUsuario } },
      );
      assert.equal(visitaRealizada.estado, 200);
      assert.equal(visitaRealizada.cuerpo.estado, 'realizada');
      const compromisosEnProgreso = await solicitar(
        `/trabajo/portal-reparador/${idUsuario}/compromisos`,
        { token: tokenReparador },
      );
      assert.ok(
        compromisosEnProgreso.cuerpo.en_progreso.some(
          (item) => item.idServicio === idServicio,
        ),
      );

      const visitaPosteriorInicio = await solicitar(`/visita/servicio/${idServicio}`, {
        token: tokenReparador,
        method: 'POST',
        body: {
          id_usuario: idUsuario,
          fecha_inicio: visitaCancelableInicio.toISOString(),
          fecha_fin: visitaCancelableFin.toISOString(),
        },
      });
      assert.equal(visitaPosteriorInicio.estado, 201);
      const cancelarVisitaTrasInicio = await solicitar(
        `/visita/${visitaPosteriorInicio.cuerpo.idVisita}/estado`,
        {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: { id_usuario: idClienteDirecto, estado: 'cancelada' },
        },
      );
      assert.equal(cancelarVisitaTrasInicio.estado, 400);

      const estadoTrasVisita = await solicitar(`/servicio/${idServicio}`, {
        token: tokenReparador,
      });
      assert.equal(estadoTrasVisita.estado, 200);
      assert.equal(estadoTrasVisita.cuerpo.estado, 'en_progreso');

      const notaTecnica = await solicitar('/servicio/bitacora/nota', {
        token: tokenReparador,
        method: 'POST',
        body: {
          id_servicio: idServicio,
          id_usuario: idUsuario,
          detalle: `Nota temporal ${sufijo}`,
        },
      });
      assert.equal(notaTecnica.estado, 201);
      const bitacora = await solicitar(
        `/trabajo/${solicitudDirecta.cuerpo.idTrabajo}/bitacora?id_usuario=${idClienteDirecto}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(bitacora.estado, 200);
      assert.ok(bitacora.cuerpo.some((evento) => evento.es_evento_sistema));
      assert.ok(bitacora.cuerpo.some((evento) => evento.es_nota_manual));

      const incremento = await solicitar(`/servicio/${idServicio}/presupuesto`, {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_solicitante: idClienteDirecto,
          monto_anterior: 250,
          monto_nuevo: 300,
          motivo: 'Hallazgo de prueba durante la reparación',
        },
      });
      assert.equal(incremento.estado, 201);
      assert.equal(incremento.cuerpo.estadoAprobacion, 'pendiente');
      const aprobarIncremento = await solicitar(
        `/servicio/presupuesto/${incremento.cuerpo.idIncremento}/dictaminar`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: { id_admin: idAdmin, estado_aprobacion: 'aprobado' },
        },
      );
      assert.equal(aprobarIncremento.estado, 200);
      assert.equal(aprobarIncremento.cuerpo.estadoAprobacion, 'aprobado');

      const disminucionReparador = await solicitar(
        `/servicio/${idServicio}/presupuesto`,
        {
          token: tokenReparador,
          method: 'POST',
          body: {
            id_solicitante: idUsuario,
            monto_anterior: 300,
            monto_nuevo: 280,
            motivo: 'Disminución acordada tras revisar los materiales.',
          },
        },
      );
      assert.equal(disminucionReparador.estado, 201, JSON.stringify(disminucionReparador.cuerpo));
      assert.equal(disminucionReparador.cuerpo.estadoAprobacion, 'aprobado');
      const montoTrasDisminucion = await db.orm.public.Propuesta
        .where({ idPropuesta: servicio.idPropuesta })
        .first();
      assert.equal(Number(montoTrasDisminucion.precioTotal), 280);

      const incrementoRechazado = await solicitar(
        `/servicio/${idServicio}/presupuesto`,
        {
          token: tokenClienteDirecto,
          method: 'POST',
          body: {
            id_solicitante: idClienteDirecto,
            monto_anterior: 280,
            monto_nuevo: 350,
            motivo: 'Aumento temporal para probar un rechazo administrativo.',
          },
        },
      );
      assert.equal(incrementoRechazado.estado, 201);
      const rechazarIncremento = await solicitar(
        `/servicio/presupuesto/${incrementoRechazado.cuerpo.idIncremento}/dictaminar`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: { id_admin: idAdmin, estado_aprobacion: 'rechazado' },
        },
      );
      assert.equal(rechazarIncremento.estado, 200);
      assert.equal(rechazarIncremento.cuerpo.estadoAprobacion, 'rechazado');
      const montoTrasRechazo = await db.orm.public.Propuesta
        .where({ idPropuesta: servicio.idPropuesta })
        .first();
      assert.equal(Number(montoTrasRechazo.precioTotal), 280);

      const pago = await solicitar('/pago/declarar', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          id_servicio: idServicio,
          monto: 280,
          metodo: 'qr',
          comprobante_url: `test://${sufijo}/comprobante`,
        },
      });
      assert.equal(pago.estado, 201);
      assert.equal(pago.cuerpo.estado, 'declarado');
      const pagoAjeno = await solicitar(`/pago/${pago.cuerpo.idPago}`, {
        token: tokenReparadorAjeno,
      });
      assert.equal(pagoAjeno.estado, 403);
      const confirmarPago = await solicitar(`/pago/${pago.cuerpo.idPago}/confirmar`, {
        token: tokenReparador,
        method: 'PATCH',
        body: { id_reparador: idUsuario },
      });
      assert.equal(confirmarPago.estado, 200);
      assert.equal(confirmarPago.cuerpo.estado, 'confirmado');
      const aprobarPago = await solicitar(`/pago/${pago.cuerpo.idPago}/auditar`, {
        token: tokenAdministrador,
        method: 'PATCH',
        body: { id_admin: idAdmin, estado: 'aprobado' },
      });
      assert.equal(aprobarPago.estado, 200, JSON.stringify(aprobarPago.cuerpo));
      assert.equal(aprobarPago.cuerpo.estado, 'aprobado');

      const completar = await solicitar(`/servicio/${idServicio}/completar`, {
        token: tokenReparador,
        method: 'PATCH',
        body: { id_reparador: idUsuario },
      });
      assert.equal(completar.estado, 200);
      assert.equal(completar.cuerpo.estado, 'completado');

      const calificacion = await solicitar('/calificacion', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_servicio: idServicio,
          id_evaluador: idClienteDirecto,
          id_evaluado: idUsuario,
          puntuacion: 5,
          comentario: 'Calificación de integración',
        },
      });
      assert.equal(calificacion.estado, 201);
      assert.equal(calificacion.cuerpo.puntuacion, 5);
      const calificacionAjena = await solicitar(
        `/calificacion/${calificacion.cuerpo.idCalificacion}`,
        { token: tokenReparadorAjeno },
      );
      assert.equal(calificacionAjena.estado, 403);
      const calificacionPropia = await solicitar(
        `/calificacion/${calificacion.cuerpo.idCalificacion}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(calificacionPropia.estado, 200);

      const reclamo = await solicitar('/reclamo', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_servicio: idServicio,
          id_usuario: idClienteDirecto,
          motivo: `Reclamo temporal ${sufijo}`,
        },
      });
      assert.equal(reclamo.estado, 201);
      assert.equal(reclamo.cuerpo.estado, 'abierto');
      const reclamosServicioAjeno = await solicitar(
        `/reclamo/servicio/${idServicio}`,
        { token: tokenReparadorAjeno },
      );
      assert.equal(reclamosServicioAjeno.estado, 403);
      const reclamosServicioPropio = await solicitar(
        `/reclamo/servicio/${idServicio}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(reclamosServicioPropio.estado, 200);
      const reclamoAjeno = await solicitar(`/reclamo/${reclamo.cuerpo.idReclamo}`, {
        token: tokenReparadorAjeno,
      });
      assert.equal(reclamoAjeno.estado, 403);
      const reclamoEnRevision = await solicitar(
        `/reclamo/${reclamo.cuerpo.idReclamo}/resolver`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: {
            id_soporte: idAdmin,
            descripcion: 'Se inicia revisión administrativa de integración.',
            estado: 'en_revision',
          },
        },
      );
      assert.equal(reclamoEnRevision.estado, 200);
      assert.equal(reclamoEnRevision.cuerpo.estado, 'en_revision');
      const resolverReclamo = await solicitar(
        `/reclamo/${reclamo.cuerpo.idReclamo}/resolver`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: {
            id_soporte: idAdmin,
            descripcion: 'Resolución de integración',
            estado: 'resuelto',
          },
        },
      );
      assert.equal(resolverReclamo.estado, 200);
      assert.equal(resolverReclamo.cuerpo.estado, 'resuelto');
      assert.ok(resolverReclamo.cuerpo.reclamoAccions.length >= 2);

      const reclamoRechazado = await solicitar('/reclamo', {
        token: tokenReparador,
        method: 'POST',
        body: {
          id_servicio: idServicio,
          id_usuario: idUsuario,
          motivo: `Reclamo para probar rechazo ${sufijo}`,
        },
      });
      assert.equal(reclamoRechazado.estado, 201);
      const rechazarReclamo = await solicitar(
        `/reclamo/${reclamoRechazado.cuerpo.idReclamo}/resolver`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: {
            id_soporte: idAdmin,
            descripcion: 'Se rechaza el reclamo temporal de integración.',
            estado: 'rechazado',
          },
        },
      );
      assert.equal(rechazarReclamo.estado, 200);
      assert.equal(rechazarReclamo.cuerpo.estado, 'rechazado');

      const trabajoParaCancelar = await solicitar('/trabajo/directo', {
        token: tokenClienteDirecto,
        method: 'POST',
        body: {
          id_cliente: idClienteDirecto,
          id_reparador: idUsuario,
          direccion: 'Dirección de cancelación de integración',
          latitud: -16.5,
          longitud: -68.15,
          titulo: `Cancelación de prueba ${sufijo.slice(0, 8)}`,
          descripcion: 'Servicio temporal para comprobar cancelación y republicación.',
          fecha_preferida: fechaPreferida,
          categorias: [categoria.idCategoria],
        },
      });
      assert.equal(trabajoParaCancelar.estado, 201);
      idsTrabajo.push(trabajoParaCancelar.cuerpo.idTrabajo);
      const idPropuestaCancelacion =
        trabajoParaCancelar.cuerpo.propuestas[0].idPropuesta;
      const cotizarCancelacion = await solicitar(
        `/propuesta/${idPropuestaCancelacion}/cotizar`,
        {
          token: tokenReparador,
          method: 'PATCH',
          body: {
            id_reparador: idUsuario,
            precio_total: 180,
            materiales_incluidos: false,
          },
        },
      );
      assert.equal(cotizarCancelacion.estado, 200);
      const aceptarCancelacion = await solicitar(
        `/propuesta/${idPropuestaCancelacion}/aceptar`,
        { token: tokenClienteDirecto, method: 'PATCH', body: { id_cliente: idClienteDirecto } },
      );
      assert.equal(aceptarCancelacion.estado, 200);
      const servicioCancelado = await db.orm.public.Servicio.where({
        idPropuesta: idPropuestaCancelacion,
      }).first();
      assert.ok(servicioCancelado);
      idsServicio.push(servicioCancelado.idServicio);

      const cancelar = await solicitar(
        `/servicio/${servicioCancelado.idServicio}/cancelar`,
        {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: {
            id_usuario: idClienteDirecto,
            motivo: 'No puedo continuar con la solicitud de prueba.',
          },
        },
      );
      assert.equal(cancelar.estado, 200);
      assert.equal(cancelar.cuerpo.estado, 'cancelado');
      const trabajoRepublicado = await solicitar(
        `/trabajo/${trabajoParaCancelar.cuerpo.idTrabajo}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(trabajoRepublicado.estado, 200);
      assert.equal(trabajoRepublicado.cuerpo.estadoPublicacion, 'abierto');
      assert.equal(trabajoRepublicado.cuerpo.tipoSolicitud, 'abierta');
      const reclamosCancelacion = await solicitar(
        `/reclamo/servicio/${servicioCancelado.idServicio}`,
        { token: tokenClienteDirecto },
      );
      assert.equal(reclamosCancelacion.estado, 200);
      assert.ok(
        reclamosCancelacion.cuerpo.some(
          (reclamo) =>
            reclamo.motivo.includes('No puedo continuar con la solicitud de prueba.') &&
            reclamo.idUsuario === idClienteDirecto,
        ),
        'el trigger debe registrar la identidad y el motivo del cliente',
      );

      const busquedaTecnicos = await solicitar(
        `/trabajo/tecnicos-directos?id_categoria=${categoria.idCategoria}&latitud=-16.5&longitud=-68.15`,
      );
      assert.equal(busquedaTecnicos.estado, 200);
      assert.ok(
        busquedaTecnicos.cuerpo.some(
          (tecnico) => tecnico.id_reparador === idUsuario,
        ),
      );

      const sinPermisoAdmin = await solicitar(
        `/usuario/admin/roles?id_admin=${idUsuario}`,
        { token: tokenCliente },
      );
      assert.equal(sinPermisoAdmin.estado, 403);

      const crearServicioCancelacionReparador = async (titulo, precio_total) => {
        const trabajoCreado = await solicitar('/trabajo/directo', {
          token: tokenClienteDirecto,
          method: 'POST',
          body: {
            id_cliente: idClienteDirecto,
            id_reparador: idUsuario,
            direccion: 'Dirección para probar cancelación pendiente.',
            latitud: -16.5,
            longitud: -68.15,
            titulo: `${titulo} ${sufijo.slice(0, 8)}`,
            descripcion: 'Servicio temporal para probar la revisión de cancelación.',
            fecha_preferida: fechaPreferida,
            categorias: [categoria.idCategoria],
          },
        });
        assert.equal(trabajoCreado.estado, 201, JSON.stringify(trabajoCreado.cuerpo));
        idsTrabajo.push(trabajoCreado.cuerpo.idTrabajo);
        const id_propuesta = trabajoCreado.cuerpo.propuestas[0].idPropuesta;
        const cotizacionDirecta = await solicitar(`/propuesta/${id_propuesta}/cotizar`, {
          token: tokenReparador,
          method: 'PATCH',
          body: {
            id_reparador: idUsuario,
            precio_total,
            materiales_incluidos: false,
          },
        });
        assert.equal(cotizacionDirecta.estado, 200);
        const aceptacionDirecta = await solicitar(`/propuesta/${id_propuesta}/aceptar`, {
          token: tokenClienteDirecto,
          method: 'PATCH',
          body: { id_cliente: idClienteDirecto },
        });
        assert.equal(aceptacionDirecta.estado, 200);
        const servicioCreado = await db.orm.public.Servicio.where({ idPropuesta: id_propuesta }).first();
        assert.ok(servicioCreado);
        idsServicio.push(servicioCreado.idServicio);
        return {
          id_trabajo: trabajoCreado.cuerpo.idTrabajo,
          id_servicio: servicioCreado.idServicio,
        };
      };

      const servicioConSolicitudRechazada =
        await crearServicioCancelacionReparador('Cancelación rechazada', 140);
      const solicitudCancelacionRechazada = await solicitar(
        `/servicio/${servicioConSolicitudRechazada.id_servicio}/cancelar`,
        {
          token: tokenReparador,
          method: 'PATCH',
          body: {
            id_usuario: idUsuario,
            motivo: 'Solicito cancelar por falta de disponibilidad.',
          },
        },
      );
      assert.equal(solicitudCancelacionRechazada.estado, 200);
      assert.equal(solicitudCancelacionRechazada.cuerpo.estado, 'pendiente_aprobacion');
      const servicioSigueActivoTrasSolicitud = await db.orm.public.Servicio
        .where({ idServicio: servicioConSolicitudRechazada.id_servicio })
        .first();
      assert.equal(servicioSigueActivoTrasSolicitud.estado, 'programado');
      const rechazoSolicitudCancelacion = await solicitar(
        `/reclamo/${solicitudCancelacionRechazada.cuerpo.reclamo.idReclamo}/resolver`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: {
            id_soporte: idAdmin,
            descripcion: 'No se aprueba la cancelación solicitada.',
            estado: 'rechazado',
          },
        },
      );
      assert.equal(rechazoSolicitudCancelacion.estado, 200);
      const servicioSigueActivoTrasRechazo = await db.orm.public.Servicio
        .where({ idServicio: servicioConSolicitudRechazada.id_servicio })
        .first();
      assert.equal(servicioSigueActivoTrasRechazo.estado, 'programado');
      const trabajoNoRepublicado = await db.orm.public.Trabajo
        .where({ idTrabajo: servicioConSolicitudRechazada.id_trabajo })
        .first();
      assert.equal(trabajoNoRepublicado.estadoPublicacion, 'cerrado');

      const servicioConSolicitudAprobada =
        await crearServicioCancelacionReparador('Cancelación aprobada', 160);
      const solicitudCancelacionAprobada = await solicitar(
        `/servicio/${servicioConSolicitudAprobada.id_servicio}/cancelar`,
        {
          token: tokenReparador,
          method: 'PATCH',
          body: {
            id_usuario: idUsuario,
            motivo: 'Solicito cancelar por una condición imprevista.',
          },
        },
      );
      assert.equal(solicitudCancelacionAprobada.estado, 200);
      const aprobarSolicitudCancelacion = await solicitar(
        `/reclamo/${solicitudCancelacionAprobada.cuerpo.reclamo.idReclamo}/resolver`,
        {
          token: tokenAdministrador,
          method: 'PATCH',
          body: {
            id_soporte: idAdmin,
            descripcion: 'Se aprueba la cancelación solicitada por el reparador.',
            estado: 'resuelto',
          },
        },
      );
      assert.equal(aprobarSolicitudCancelacion.estado, 200, JSON.stringify(aprobarSolicitudCancelacion.cuerpo));
      const servicioCanceladoPorAprobacion = await db.orm.public.Servicio
        .where({ idServicio: servicioConSolicitudAprobada.id_servicio })
        .first();
      assert.equal(servicioCanceladoPorAprobacion.estado, 'cancelado');
      const trabajoRepublicadoPorAprobacion = await db.orm.public.Trabajo
        .where({ idTrabajo: servicioConSolicitudAprobada.id_trabajo })
        .first();
      assert.equal(trabajoRepublicadoPorAprobacion.tipoSolicitud, 'abierta');
      assert.equal(trabajoRepublicadoPorAprobacion.estadoPublicacion, 'abierto');
      const reclamosCancelacionAprobada = await db.orm.public.Reclamo.where({
        idServicio: servicioConSolicitudAprobada.id_servicio,
      }).all();
      assert.equal(reclamosCancelacionAprobada.length, 1);
      assert.equal(reclamosCancelacionAprobada[0].estado, 'resuelto');
      assert.equal(reclamosCancelacionAprobada[0].idUsuario, idUsuario);
      assert.equal(
        reclamosCancelacionAprobada[0].motivo,
        'Solicito cancelar por una condición imprevista.',
      );

      const perfilPublico = await solicitar(`/usuario/${idUsuario}`, {
        token: tokenReparador,
      });
      assert.equal(perfilPublico.estado, 200);
      assert.equal('passwordHash' in perfilPublico.cuerpo, false);
    } finally {
      try {
        for (const idServicio of idsServicio.reverse()) {
          await db.orm.public.Calificacion.where({ idServicio }).delete();
          await db.orm.public.Pago.where({ idServicio }).delete();
          const reclamos_del_servicio = await db.orm.public.Reclamo.where({
            idServicio,
          }).all();
          for (const reclamo_del_servicio of reclamos_del_servicio) {
            await db.orm.public.ReclamoAccion.where({
              idReclamo: reclamo_del_servicio.idReclamo,
            }).delete();
            await db.orm.public.Reclamo.where({
              idReclamo: reclamo_del_servicio.idReclamo,
            }).delete();
          }
          await db.orm.public.Servicio.where({ idServicio }).delete();
        }
        for (const idTrabajo of idsTrabajo.reverse()) {
          await db.orm.public.Trabajo.where({ idTrabajo }).delete();
        }
        for (const id of idsUsuario.reverse()) {
          await db.orm.public.Usuario.where({ idUsuario: id }).delete();
        }
        for (const idRol of idsRol.reverse()) {
          await db.orm.public.Rol.where({ idRol }).delete();
        }
        for (const idCategoria of idsCategoriaAdmin.reverse()) {
          await db.orm.public.Categoria.where({ idCategoria }).delete();
        }
      } finally {
        if (aplicacion) {
          await aplicacion.close();
        }
        await db.close();
      }
    }
  },
);
