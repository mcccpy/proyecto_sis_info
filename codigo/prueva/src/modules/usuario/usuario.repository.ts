import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  FiltroDocumentosClientesDto,
  FiltroModeracionReparadoresDto,
} from './dto/filtros-admin.dto';

type FiltrosModeracionReparadores = Omit<
  FiltroModeracionReparadoresDto,
  'id_admin'
>;
type FiltrosDocumentosClientes = Omit<FiltroDocumentosClientesDto, 'id_admin'>;

/** Campos base que el repository inserta en la tabla de usuarios. */
export interface NuevoUsuarioData {
  nombre: string;
  email: string;
  telefono: string;
  passwordHash: string;
}

/** Campos de documento con los nombres usados por el contrato de Prisma. */
export interface DocumentoUsuarioData {
  tipoDocumento: string;
  ubucacionArchivo: string;
  urlYN: boolean;
}

/** Ejecuta únicamente consultas y escrituras de las tablas relacionadas con usuarios. */
@Injectable()
export class UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve solo el identificador de una cuenta existente. */
  findIdUsuario(id_usuario: number) {
    return this.prisma.db.orm.public.Usuario.where({
      idUsuario: id_usuario,
    })
      .select('idUsuario')
      .first();
  }

  /** Comprueba si una cuenta tiene asignado el rol indicado. */
  async tieneRol(id_usuario: number, nombre_rol: string): Promise<boolean> {
    const rol = await this.prisma.db.orm.public.Rol.where({
      nombre: nombre_rol,
    }).first();

    if (!rol) {
      return false;
    }

    const asignacion_rol = await this.prisma.db.orm.public.UsuarioRol.where({
      idUsuario: id_usuario,
      idRol: rol.idRol,
    }).first();

    return asignacion_rol !== null;
  }

  /** Comprueba si la cuenta está vinculada al rol administrador. */
  async esAdministrador(id_usuario: number): Promise<boolean> {
    const rol_administrador = await this.prisma.db.orm.public.Rol.where({
      nombre: 'administrador',
    }).first();

    if (!rol_administrador) {
      return false;
    }

    const asignacion_administrativa =
      await this.prisma.db.orm.public.UsuarioRol.where({
        idUsuario: id_usuario,
        idRol: rol_administrador.idRol,
      }).first();

    return asignacion_administrativa !== null;
  }

  /** Busca perfiles y filtra sus documentos por tipo y fecha de subida. */
  async findSolicitudesReparadores(filtros: FiltrosModeracionReparadores) {
    const ids_usuarios_coincidentes = filtros.busqueda?.trim()
      ? await this.buscarIdsUsuarios(filtros.busqueda)
      : null;

    if (
      ids_usuarios_coincidentes !== null &&
      ids_usuarios_coincidentes.length === 0
    ) {
      return [];
    }

    const perfiles = this.prisma.db.orm.public.PerfilTrabajador;
    const perfiles_por_estado = filtros.estado_aprobacion
      ? perfiles.where({ estadoAprobacion: filtros.estado_aprobacion })
      : perfiles;
    const perfiles_filtrados = ids_usuarios_coincidentes
      ? perfiles_por_estado.where((perfil) =>
          perfil.idUsuario.in(ids_usuarios_coincidentes),
        )
      : perfiles_por_estado;

    return perfiles_filtrados
      .include('usuario', (usuario) =>
        usuario
          .include('documentoUsuarios', (documentos_del_usuario) => {
            const documentos_por_tipo = filtros.tipo_documento
              ? documentos_del_usuario.where({
                  tipoDocumento: filtros.tipo_documento,
                })
              : documentos_del_usuario;
            const documentos_desde_fecha = filtros.fecha_desde
              ? documentos_por_tipo.where((documento) =>
                  documento.fechaSubida.gte(new Date(filtros.fecha_desde!)),
                )
              : documentos_por_tipo;
            const documentos_hasta_fecha = filtros.fecha_hasta
              ? documentos_desde_fecha.where((documento) =>
                  documento.fechaSubida.lte(new Date(filtros.fecha_hasta!)),
                )
              : documentos_desde_fecha;

            return documentos_hasta_fecha.orderBy((documento) =>
              documento.fechaSubida.desc(),
            );
          })
          .select('idUsuario', 'nombre', 'email', 'telefono', 'fechaRegistro'),
      )
      .include('categoriaReparadors', (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
      )
      .include('zonaReparadors')
      .include('disponibilidads')
      .all();
  }

  /** Obtiene el detalle de perfil, cuenta, categorías, zonas, horarios y documentos. */
  findDetalleReparadorAdmin(id_reparador: number) {
    return this.prisma.db.orm.public.PerfilTrabajador.include(
      'usuario',
      (usuario) =>
        usuario
          .include('documentoUsuarios')
          .select('idUsuario', 'nombre', 'email', 'telefono', 'fechaRegistro'),
    )
      .include('categoriaReparadors', (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
      )
      .include('zonaReparadors')
      .include('disponibilidads')
      .where({ idUsuario: id_reparador })
      .first();
  }

  /** Busca un documento de usuario por su clave primaria. */
  findDocumentoUsuarioById(id_documento: number) {
    return this.prisma.db.orm.public.DocumentoUsuario.where({
      idDocumentoUs: id_documento,
    }).first();
  }

  /** Actualiza el dictamen de un documento y devuelve el registro actualizado. */
  async actualizarEstadoDocumentoUsuario(
    id_documento: number,
    estado: 'aprobado' | 'rechazado',
  ) {
    const documento_actualizado =
      await this.prisma.db.orm.public.DocumentoUsuario.where({
        idDocumentoUs: id_documento,
      }).update({ estado });

    if (!documento_actualizado) {
      return null;
    }

    return this.findDocumentoUsuarioById(id_documento);
  }

  /** Actualiza el dictamen de un reparador y devuelve el perfil completo. */
  async actualizarEstadoAprobacionReparador(
    id_reparador: number,
    estado_aprobacion: 'aprobado' | 'rechazado',
  ) {
    const perfil_actualizado =
      await this.prisma.db.orm.public.PerfilTrabajador.where({
        idUsuario: id_reparador,
      }).update({ estadoAprobacion: estado_aprobacion });

    if (!perfil_actualizado) {
      return null;
    }

    return this.findDetalleReparadorAdmin(id_reparador);
  }

  /** Lista documentos de usuarios con rol cliente y aplica sus filtros opcionales. */
  async findDocumentosClientes(filtros: FiltrosDocumentosClientes) {
    const rol_cliente = await this.prisma.db.orm.public.Rol.where({
      nombre: 'cliente',
    }).first();

    if (!rol_cliente) {
      return [];
    }

    const asignaciones_cliente =
      await this.prisma.db.orm.public.UsuarioRol.where({
        idRol: rol_cliente.idRol,
      })
        .select('idUsuario')
        .all();
    let ids_usuarios_cliente = asignaciones_cliente.map(
      (asignacion) => asignacion.idUsuario,
    );

    if (filtros.busqueda?.trim()) {
      const ids_usuarios_coincidentes = await this.buscarIdsUsuarios(
        filtros.busqueda,
      );
      const conjunto_ids_coincidentes = new Set(ids_usuarios_coincidentes);

      ids_usuarios_cliente = ids_usuarios_cliente.filter((id_usuario) =>
        conjunto_ids_coincidentes.has(id_usuario),
      );
    }

    if (ids_usuarios_cliente.length === 0) {
      return [];
    }

    const documentos_de_clientes =
      this.prisma.db.orm.public.DocumentoUsuario.where((documento) =>
        documento.idUsuario.in(ids_usuarios_cliente),
      );
    const documentos_por_estado = filtros.estado
      ? documentos_de_clientes.where({ estado: filtros.estado })
      : documentos_de_clientes;
    const documentos_por_tipo = filtros.tipo_documento
      ? documentos_por_estado.where({
          tipoDocumento: filtros.tipo_documento,
        })
      : documentos_por_estado;
    const documentos_desde_fecha = filtros.fecha_desde
      ? documentos_por_tipo.where((documento) =>
          documento.fechaSubida.gte(new Date(filtros.fecha_desde!)),
        )
      : documentos_por_tipo;
    const documentos_hasta_fecha = filtros.fecha_hasta
      ? documentos_desde_fecha.where((documento) =>
          documento.fechaSubida.lte(new Date(filtros.fecha_hasta!)),
        )
      : documentos_desde_fecha;

    return documentos_hasta_fecha
      .include('usuario', (usuario) =>
        usuario.select('idUsuario', 'nombre', 'email', 'telefono'),
      )
      .all();
  }

  /** Obtiene la cuenta con los roles, perfil profesional y documentos asociados. */
  findById(
    id_usuario: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Usuario.include(
      'usuarioRols',
      (roles_del_usuario) => roles_del_usuario.include('rol'),
    )
      .include('perfilTrabajador')
      .include('documentoUsuarios')
      .where({ idUsuario: id_usuario })
      .first();
  }

  /** Busca primero por correo y, si no hay coincidencia, por teléfono. */
  async findByEmailOrTelefono(
    email: string,
    telefono: string,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    const usuario_por_correo = await query_context.orm.public.Usuario.where({
      email,
    }).first();

    if (usuario_por_correo) {
      return usuario_por_correo;
    }

    return query_context.orm.public.Usuario.where({ telefono }).first();
  }

  /** Busca el identificador de un rol a partir de su nombre. */
  findRolByNombre(
    nombre_rol: string,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Rol.where({
      nombre: nombre_rol,
    }).first();
  }

  /** Inserta la información base de la cuenta y su hash de contraseña. */
  createUsuarioBase(
    datos_usuario: NuevoUsuarioData,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Usuario.create(datos_usuario);
  }

  /** Asocia un rol existente con la cuenta indicada. */
  async asignarRol(
    id_usuario: number,
    id_rol: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ): Promise<void> {
    await query_context.orm.public.UsuarioRol.create({
      idUsuario: id_usuario,
      idRol: id_rol,
    });
  }

  /** Guarda los documentos recibidos o no hace escrituras cuando la lista está vacía. */
  async crearDocumentos(
    id_usuario: number,
    documentos: readonly DocumentoUsuarioData[],
    query_context: PrismaQueryContext = this.prisma.db,
  ): Promise<void> {
    if (documentos.length === 0) {
      return;
    }

    await query_context.orm.public.DocumentoUsuario.createAll(
      documentos.map((documento) => ({
        idUsuario: id_usuario,
        tipoDocumento: documento.tipoDocumento,
        ubucacionArchivo: documento.ubucacionArchivo,
        urlYN: documento.urlYN,
      })),
    );
  }

  /** Mantiene todas las escrituras relacionadas dentro de una misma transacción. */
  ejecutarEnTransaccion<T>(
    operacion: (query_context: PrismaQueryContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.db.transaction((transaccion) => operacion(transaccion));
  }

  /** Encuentra identificadores de usuarios por nombre, correo o coincidencia numérica. */
  private async buscarIdsUsuarios(busqueda: string): Promise<number[]> {
    const texto_busqueda = busqueda.trim();

    if (!texto_busqueda) {
      return [];
    }

    const patron_busqueda = `%${texto_busqueda}%`;
    const [usuarios_por_nombre, usuarios_por_correo] = await Promise.all([
      this.prisma.db.orm.public.Usuario.where((usuario) =>
        usuario.nombre.ilike(patron_busqueda),
      )
        .select('idUsuario')
        .all(),
      this.prisma.db.orm.public.Usuario.where((usuario) =>
        usuario.email.ilike(patron_busqueda),
      )
        .select('idUsuario')
        .all(),
    ]);
    const ids_encontrados = new Set<number>([
      ...usuarios_por_nombre.map((usuario) => usuario.idUsuario),
      ...usuarios_por_correo.map((usuario) => usuario.idUsuario),
    ]);
    const id_numerico = Number(texto_busqueda);

    if (/^\d+$/.test(texto_busqueda) && Number.isSafeInteger(id_numerico)) {
      ids_encontrados.add(id_numerico);
    }

    return [...ids_encontrados];
  }
}
