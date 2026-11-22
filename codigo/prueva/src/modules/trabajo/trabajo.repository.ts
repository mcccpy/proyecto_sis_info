import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { FiltroDocumentosTrabajosDto } from '../usuario/dto/filtros-admin.dto';

type FiltrosDocumentosTrabajos = Omit<FiltroDocumentosTrabajosDto, 'id_admin'>;

/** Campos persistidos de un archivo adjunto a un trabajo. */
export interface DocumentoTrabajoData {
  tipoDocumento: string;
  ubucacionArchivo: string;
  urlYN: boolean;
}

/** Datos compartidos para crear una solicitud de trabajo. */
export interface CrearTrabajoClienteData {
  idCliente: number;
  direccion: string;
  latitud: number;
  longitud: number;
  titulo: string;
  descripcion: string;
  fechaPreferida: Date;
  categorias: readonly number[];
  documentos: readonly DocumentoTrabajoData[];
}

/** Datos adicionales requeridos para crear una solicitud directa. */
export interface CrearTrabajoDirectoData extends CrearTrabajoClienteData {
  idReparador: number;
}

/** Ejecuta las consultas para el perfil del reparador y su feed de trabajos. */
@Injectable()
export class TrabajoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista el historial del cliente con sus propuestas y servicios asociados. */
  findTrabajosByCliente(id_cliente: number) {
    return this.prisma.db.orm.public.Trabajo.where({
      idCliente: id_cliente,
      deletedAt: null,
    })
      .include('propuestas', (propuestas_del_trabajo) =>
        propuestas_del_trabajo.include('servicio', (servicio) =>
          servicio.select('estado'),
        ),
      )
      .orderBy((trabajo) => trabajo.fechaCreacion.desc())
      .all();
  }

  /** Crea trabajo abierto, categorías y documentos dentro de una transacción. */
  createTrabajoAbierto(datos_trabajo: CrearTrabajoClienteData) {
    return this.prisma.db.transaction(async (transaccion) => {
      const trabajo_creado = await this.insertarTrabajo(
        datos_trabajo,
        'abierta',
        transaccion,
      );

      await this.insertarCategoriasYDocumentos(
        trabajo_creado.idTrabajo,
        datos_trabajo,
        transaccion,
      );

      return this.obtenerTrabajoCreado(trabajo_creado.idTrabajo, transaccion);
    });
  }

  /** Crea un trabajo directo, su propuesta inicial y sus relaciones de forma atómica. */
  createTrabajoDirectoConPropuesta(datos_trabajo: CrearTrabajoDirectoData) {
    return this.prisma.db.transaction(async (transaccion) => {
      const trabajo_creado = await this.insertarTrabajo(
        datos_trabajo,
        'directa',
        transaccion,
      );

      await this.insertarCategoriasYDocumentos(
        trabajo_creado.idTrabajo,
        datos_trabajo,
        transaccion,
      );
      const propuesta_creada = await transaccion.orm.public.Propuesta.create({
        idTrabajo: trabajo_creado.idTrabajo,
        idReparador: datos_trabajo.idReparador,
        precioTotal: '0',
        estado: 'pendiente',
      });
      const trabajo_con_relaciones = await this.obtenerTrabajoCreado(
        trabajo_creado.idTrabajo,
        transaccion,
      );

      return {
        ...trabajo_con_relaciones,
        propuestas: [propuesta_creada],
      };
    });
  }

  /** Devuelve únicamente los identificadores de categorías que existen. */
  async findCategoriasExistentes(
    ids_categorias: readonly number[],
  ): Promise<number[]> {
    if (ids_categorias.length === 0) {
      return [];
    }

    const categorias_existentes =
      await this.prisma.db.orm.public.Categoria.where((categoria) =>
        categoria.idCategoria.in(ids_categorias),
      )
        .select('idCategoria')
        .all();

    return categorias_existentes.map((categoria) => categoria.idCategoria);
  }

  /** Lista documentos de trabajos aplicando filtros de trabajo, cliente, tipo y fecha. */
  async findDocumentosTrabajosAdmin(filtros: FiltrosDocumentosTrabajos) {
    let ids_trabajos_filtrados: number[] | null = null;

    if (filtros.busqueda?.trim()) {
      ids_trabajos_filtrados = await this.buscarIdsTrabajos(filtros.busqueda);
    }

    if (filtros.id_trabajo !== undefined) {
      ids_trabajos_filtrados = this.intersectarIds(ids_trabajos_filtrados, [
        filtros.id_trabajo,
      ]);
    }

    if (filtros.id_cliente !== undefined) {
      const trabajos_del_cliente =
        await this.prisma.db.orm.public.Trabajo.where({
          idCliente: filtros.id_cliente,
        })
          .select('idTrabajo')
          .all();
      const ids_trabajos_del_cliente = trabajos_del_cliente.map(
        (trabajo) => trabajo.idTrabajo,
      );

      ids_trabajos_filtrados = this.intersectarIds(
        ids_trabajos_filtrados,
        ids_trabajos_del_cliente,
      );
    }

    if (
      ids_trabajos_filtrados !== null &&
      ids_trabajos_filtrados.length === 0
    ) {
      return [];
    }

    const documentos = this.prisma.db.orm.public.DocumentoTrabajo;
    const documentos_por_trabajos = ids_trabajos_filtrados
      ? documentos.where((documento) =>
          documento.idTrabajo.in(ids_trabajos_filtrados),
        )
      : documentos;
    const documentos_por_tipo = filtros.tipo_documento
      ? documentos_por_trabajos.where({
          tipoDocumento: filtros.tipo_documento,
        })
      : documentos_por_trabajos;
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
      .include('trabajo', (trabajo) =>
        trabajo
          .include('usuario', (usuario_cliente) =>
            usuario_cliente.select('idUsuario', 'nombre', 'email', 'telefono'),
          )
          .select('idTrabajo', 'titulo', 'idCliente', 'estadoPublicacion'),
      )
      .orderBy((documento) => documento.fechaSubida.desc())
      .all();
  }

  /** Carga el perfil con las categorías y zonas usadas para priorizar trabajos. */
  findReparadorConCategoriasYZonas(id_reparador: number) {
    return this.prisma.db.orm.public.PerfilTrabajador.include(
      'categoriaReparadors',
      (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
    )
      .include('zonaReparadors')
      .where({ idUsuario: id_reparador })
      .first();
  }

  /** Busca solicitudes públicas abiertas por categoría e incluye el total de propuestas. */
  findTrabajosAbiertosPorCategorias(ids_categorias: readonly number[]) {
    return this.findTrabajosAbiertosExcluyendoIds(ids_categorias, []);
  }

  /** Excluye trabajos ya postulados y carga la información necesaria para el portal. */
  findTrabajosAbiertosExcluyendoIds(
    ids_categorias: readonly number[],
    ids_trabajos_excluidos: readonly number[],
  ) {
    const consulta_de_trabajos = this.prisma.db.orm.public.Trabajo.where({
      estadoPublicacion: 'abierto',
      tipoSolicitud: 'abierta',
      deletedAt: null,
    }).where((trabajo) =>
      trabajo.categoriaTrabajos.some((categoria_trabajo) =>
        categoria_trabajo.idCategoria.in(ids_categorias),
      ),
    );

    const consulta_sin_trabajos_postulados =
      ids_trabajos_excluidos.length > 0
        ? consulta_de_trabajos.where((trabajo) =>
            trabajo.idTrabajo.notIn(ids_trabajos_excluidos),
          )
        : consulta_de_trabajos;

    return consulta_sin_trabajos_postulados
      .include('usuario', (usuario_cliente) =>
        usuario_cliente.select('idUsuario', 'nombre'),
      )
      .include('categoriaTrabajos', (categorias_del_trabajo) =>
        categorias_del_trabajo.include('categoria'),
      )
      .include('propuestas', (propuestas_del_trabajo) =>
        propuestas_del_trabajo.count(),
      )
      .all();
  }

  /** Busca las solicitudes directas vinculadas a una propuesta del reparador. */
  findSolicitudesDirectasPorReparador(id_reparador: number) {
    return this.prisma.db.orm.public.Trabajo.where({
      tipoSolicitud: 'directa',
      deletedAt: null,
    })
      .where((trabajo) =>
        trabajo.propuestas.some((propuesta) =>
          propuesta.idReparador.eq(id_reparador),
        ),
      )
      .include('usuario', (usuario_cliente) =>
        usuario_cliente.select('idUsuario', 'nombre'),
      )
      .include('categoriaTrabajos', (categorias_del_trabajo) =>
        categorias_del_trabajo.include('categoria'),
      )
      .include('propuestas', (propuestas_del_reparador) =>
        propuestas_del_reparador.where({ idReparador: id_reparador }),
      )
      .all();
  }

  /** Busca trabajos por título, cliente o coincidencia numérica con sus identificadores. */
  private async buscarIdsTrabajos(busqueda: string): Promise<number[]> {
    const texto_busqueda = busqueda.trim();
    const patron_busqueda = `%${texto_busqueda}%`;
    const [trabajos_por_titulo, usuarios_por_nombre, usuarios_por_correo] =
      await Promise.all([
        this.prisma.db.orm.public.Trabajo.where((trabajo) =>
          trabajo.titulo.ilike(patron_busqueda),
        )
          .select('idTrabajo')
          .all(),
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
    const ids_trabajo_encontrados = new Set(
      trabajos_por_titulo.map((trabajo) => trabajo.idTrabajo),
    );
    const ids_clientes_encontrados = new Set([
      ...usuarios_por_nombre.map((usuario) => usuario.idUsuario),
      ...usuarios_por_correo.map((usuario) => usuario.idUsuario),
    ]);
    const id_numerico = Number(texto_busqueda);

    if (/^\d+$/.test(texto_busqueda) && Number.isSafeInteger(id_numerico)) {
      ids_trabajo_encontrados.add(id_numerico);
      ids_clientes_encontrados.add(id_numerico);
    }

    if (ids_clientes_encontrados.size > 0) {
      const trabajos_de_clientes =
        await this.prisma.db.orm.public.Trabajo.where((trabajo) =>
          trabajo.idCliente.in([...ids_clientes_encontrados]),
        )
          .select('idTrabajo')
          .all();

      for (const trabajo of trabajos_de_clientes) {
        ids_trabajo_encontrados.add(trabajo.idTrabajo);
      }
    }

    return [...ids_trabajo_encontrados];
  }

  /** Intersecta identificadores de distintos filtros sin duplicarlos. */
  private intersectarIds(
    ids_actuales: number[] | null,
    ids_adicionales: readonly number[],
  ): number[] {
    if (ids_actuales === null) {
      return [...new Set(ids_adicionales)];
    }

    const ids_adicionales_unicos = new Set(ids_adicionales);

    return ids_actuales.filter((id_actual) =>
      ids_adicionales_unicos.has(id_actual),
    );
  }

  /** Inserta la fila principal y define el tipo y estado de publicación. */
  private insertarTrabajo(
    datos_trabajo: CrearTrabajoClienteData,
    tipo_solicitud: 'abierta' | 'directa',
    query_context: PrismaQueryContext,
  ) {
    return query_context.orm.public.Trabajo.create({
      idCliente: datos_trabajo.idCliente,
      direccion: datos_trabajo.direccion,
      latitud: datos_trabajo.latitud.toString(),
      longitud: datos_trabajo.longitud.toString(),
      titulo: datos_trabajo.titulo,
      descripcion: datos_trabajo.descripcion,
      fechaPreferida: datos_trabajo.fechaPreferida,
      estadoPublicacion: 'abierto',
      tipoSolicitud: tipo_solicitud,
    });
  }

  /** Inserta las categorías y los archivos opcionales vinculados al trabajo. */
  private async insertarCategoriasYDocumentos(
    id_trabajo: number,
    datos_trabajo: CrearTrabajoClienteData,
    query_context: PrismaQueryContext,
  ): Promise<void> {
    if (datos_trabajo.categorias.length > 0) {
      await query_context.orm.public.CategoriaTrabajo.createAll(
        datos_trabajo.categorias.map((id_categoria) => ({
          idTrabajo: id_trabajo,
          idCategoria: id_categoria,
        })),
      );
    }

    if (datos_trabajo.documentos.length > 0) {
      await query_context.orm.public.DocumentoTrabajo.createAll(
        datos_trabajo.documentos.map((documento) => ({
          idTrabajo: id_trabajo,
          tipoDocumento: documento.tipoDocumento,
          ubucacionArchivo: documento.ubucacionArchivo,
          urlYN: documento.urlYN,
        })),
      );
    }
  }

  /** Recupera el trabajo recién creado junto a sus categorías y documentos. */
  private async obtenerTrabajoCreado(
    id_trabajo: number,
    query_context: PrismaQueryContext,
  ) {
    const trabajo_creado = await query_context.orm.public.Trabajo.where({
      idTrabajo: id_trabajo,
    })
      .include('categoriaTrabajos', (categorias_del_trabajo) =>
        categorias_del_trabajo.include('categoria'),
      )
      .include('documentoTrabajos')
      .first();

    if (!trabajo_creado) {
      throw new Error(
        `No se pudo recuperar el trabajo recién creado con identificador ${id_trabajo}.`,
      );
    }

    return trabajo_creado;
  }
}
