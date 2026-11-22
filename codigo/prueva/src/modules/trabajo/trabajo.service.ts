import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilTrabajadorRepository } from '../perfil-trabajador/perfil-trabajador.repository';
import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';
import { TrabajoRepository } from './trabajo.repository';
import { PropuestaRepository } from '../propuesta/propuesta.repository';
import { ServicioRepository } from '../servicio/servicio.repository';
import { UsuarioRepository } from '../usuario/usuario.repository';
import type { FiltroDocumentosTrabajosDto } from '../usuario/dto/filtros-admin.dto';
import type { BuscarTecnicosDirectosDto } from './dto/buscar-tecnicos-directos.dto';
import type { CrearTrabajoAbiertoDto } from './dto/crear-trabajo-abierto.dto';
import type { CrearTrabajoDirectoDto } from './dto/crear-trabajo-directo.dto';
import type {
  CrearTrabajoClienteData,
  DocumentoTrabajoData,
} from './trabajo.repository';

const RADIO_TERRESTRE_METROS = 6_371_000;

type ZonaDeCobertura = NonNullable<
  Awaited<ReturnType<TrabajoRepository['findReparadorConCategoriasYZonas']>>
>['zonaReparadors'][number];
type TrabajoAbierto = Awaited<
  ReturnType<TrabajoRepository['findTrabajosAbiertosExcluyendoIds']>
>[number];
type ServicioActivo = Awaited<
  ReturnType<ServicioRepository['findServiciosActivosByReparador']>
>[number];
type PrioridadCobertura = {
  prioridad: 1 | 2 | 3;
  anillo_cobertura: 'VERDE' | 'AMARILLO' | 'ROJO';
};

type CoincidenciaDeZona = PrioridadCobertura & {
  distancia_metros: number;
  zona_coincidente: string | null;
};

/** Coordina el feed de trabajos y prioriza los resultados por cobertura geográfica. */
@Injectable()
export class TrabajoService {
  constructor(
    private readonly trabajoRepository: TrabajoRepository,
    private readonly propuestaRepository: PropuestaRepository,
    private readonly servicioRepository: ServicioRepository,
    private readonly usuarioRepository: UsuarioRepository,
    private readonly perfilTrabajadorRepository: PerfilTrabajadorRepository,
  ) {}

  /** Lista documentos de trabajo únicamente para cuentas administradoras. */
  async listarDocumentosTrabajosAdmin(
    id_admin: number,
    filtros: FiltroDocumentosTrabajosDto,
  ) {
    const es_administrador =
      id_admin > 0 && (await this.usuarioRepository.esAdministrador(id_admin));

    if (!es_administrador) {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol administrador',
      );
    }

    const { id_admin: _id_admin, ...filtros_documentos } = filtros;

    return this.trabajoRepository.findDocumentosTrabajosAdmin(
      filtros_documentos,
    );
  }

  /** Devuelve el historial del cliente con sus ofertas activas y servicio adjudicado. */
  async obtenerDashboardCliente(id_cliente: number) {
    await this.validarCliente(id_cliente);

    const trabajos_del_cliente =
      await this.trabajoRepository.findTrabajosByCliente(id_cliente);

    return trabajos_del_cliente.map((trabajo) => {
      const propuestas_no_retiradas = trabajo.propuestas.filter(
        (propuesta) => propuesta.estado !== 'retirada',
      );
      const servicio_asignado = propuestas_no_retiradas.find(
        (propuesta) => propuesta.servicio !== null,
      )?.servicio;

      return {
        id: trabajo.idTrabajo,
        id_cliente: trabajo.idCliente,
        titulo: trabajo.titulo,
        estado_publicacion: trabajo.estadoPublicacion,
        tipo_solicitud: trabajo.tipoSolicitud,
        fecha_creacion: trabajo.fechaCreacion,
        direccion: trabajo.direccion,
        fecha_preferida: trabajo.fechaPreferida,
        total_ofertas: propuestas_no_retiradas.length,
        estado_servicio: servicio_asignado?.estado ?? null,
      };
    });
  }

  /** Busca técnicos aprobados cuya cobertura alcanza la ubicación solicitada. */
  async buscarTecnicosDirectos(filtros: BuscarTecnicosDirectosDto) {
    const reparadores_aprobados =
      await this.perfilTrabajadorRepository.findReparadoresAprobadosParaBusqueda(
        {
          id_categoria: filtros.id_categoria,
          nombre: filtros.nombre,
        },
      );
    const tecnicos_con_cobertura = reparadores_aprobados.flatMap(
      (perfil_reparador) => {
        if (!perfil_reparador.usuario) {
          return [];
        }

        const mejor_zona = this.buscarMejorZona(
          filtros.latitud,
          filtros.longitud,
          perfil_reparador.zonaReparadors,
        );

        if (!mejor_zona) {
          return [];
        }

        return [
          {
            id_reparador: perfil_reparador.idUsuario,
            nombre: perfil_reparador.usuario.nombre,
            telefono: perfil_reparador.usuario.telefono,
            categorias: perfil_reparador.categoriaReparadors.map(
              (categoria_del_reparador) =>
                categoria_del_reparador.categoria.nombre,
            ),
            zonas: perfil_reparador.zonaReparadors,
            ...mejor_zona,
          },
        ];
      },
    );

    return tecnicos_con_cobertura.sort(
      (tecnico_a, tecnico_b) =>
        tecnico_a.prioridad - tecnico_b.prioridad ||
        tecnico_a.distancia_metros - tecnico_b.distancia_metros,
    );
  }

  /** Crea una publicación abierta para un cliente validado. */
  async crearTrabajoAbierto(datos_trabajo: CrearTrabajoAbiertoDto) {
    await this.validarCliente(datos_trabajo.id_cliente);
    await this.validarCategorias(datos_trabajo.categorias);

    return this.trabajoRepository.createTrabajoAbierto(
      this.mapearDatosTrabajoCliente(datos_trabajo),
    );
  }

  /** Crea una solicitud directa dentro de la cobertura de un técnico aprobado. */
  async crearTrabajoDirecto(datos_trabajo: CrearTrabajoDirectoDto) {
    await this.validarCliente(datos_trabajo.id_cliente);

    const perfil_reparador =
      await this.perfilTrabajadorRepository.findByUsuarioId(
        datos_trabajo.id_reparador,
      );

    if (!perfil_reparador || perfil_reparador.estadoAprobacion !== 'aprobado') {
      throw new BadRequestException(
        'El técnico seleccionado no está habilitado en la plataforma',
      );
    }

    if (datos_trabajo.id_reparador === datos_trabajo.id_cliente) {
      throw new BadRequestException(
        'No puedes enviarte una solicitud directa a ti mismo',
      );
    }

    const zona_con_cobertura = this.buscarMejorZona(
      datos_trabajo.latitud,
      datos_trabajo.longitud,
      perfil_reparador.zonaReparadors,
    );

    if (!zona_con_cobertura) {
      throw new BadRequestException(
        'La ubicación del trabajo está fuera del área de cobertura de este técnico',
      );
    }

    const categorias_del_trabajo = datos_trabajo.categorias ?? [];
    await this.validarCategorias(categorias_del_trabajo);

    return this.trabajoRepository.createTrabajoDirectoConPropuesta({
      ...this.mapearDatosTrabajoCliente(datos_trabajo),
      idReparador: datos_trabajo.id_reparador,
    });
  }

  /** Conserva las operaciones existentes del recurso trabajo. */
  crear(_datos_para_crear_trabajo: CreateTrabajoDto) {
    return 'This action adds a new trabajo';
  }

  /** Conserva la ruta genérica de listado existente en el módulo. */
  listarTodos() {
    return `This action returns all trabajo`;
  }

  /** Conserva la ruta genérica de lectura existente en el módulo. */
  obtenerPorId(id_trabajo: number) {
    return `This action returns a #${id_trabajo} trabajo`;
  }

  /** Conserva la ruta genérica de actualización existente en el módulo. */
  actualizar(
    id_trabajo: number,
    _datos_para_actualizar_trabajo: UpdateTrabajoDto,
  ) {
    return `This action updates a #${id_trabajo} trabajo`;
  }

  /** Conserva la ruta genérica de eliminación existente en el módulo. */
  eliminar(id_trabajo: number) {
    return `This action removes a #${id_trabajo} trabajo`;
  }

  /** Combina solicitudes directas con trabajos abiertos ordenados por anillo y distancia. */
  async obtenerFeedReparador(id_reparador: number) {
    const perfil_del_reparador =
      await this.obtenerPerfilReparador(id_reparador);
    const solicitudes_directas =
      await this.trabajoRepository.findSolicitudesDirectasPorReparador(
        id_reparador,
      );
    const ids_categorias = perfil_del_reparador.categoriaReparadors.map(
      (categoria_del_reparador) => categoria_del_reparador.idCategoria,
    );
    const zonas_del_reparador = perfil_del_reparador.zonaReparadors;

    if (ids_categorias.length === 0 || zonas_del_reparador.length === 0) {
      return {
        solicitudes_directas,
        trabajos_disponibles: [],
      };
    }

    const trabajos_candidatos =
      await this.trabajoRepository.findTrabajosAbiertosPorCategorias(
        ids_categorias,
      );

    return {
      solicitudes_directas,
      trabajos_disponibles: this.priorizarTrabajosPorCobertura(
        trabajos_candidatos,
        zonas_del_reparador,
      ),
    };
  }

  /** Construye las tres secciones de compromisos respetando su prioridad. */
  async obtenerBandejaCompromisos(id_reparador: number) {
    await this.obtenerPerfilReparador(id_reparador);

    const [servicios_activos, propuestas_directas] = await Promise.all([
      this.servicioRepository.findServiciosActivosByReparador(id_reparador),
      this.propuestaRepository.findSolicitudesDirectasPendientes(id_reparador),
    ]);

    const en_progreso = this.ordenarServiciosPorFecha(
      servicios_activos.filter((servicio) => servicio.estado === 'en_progreso'),
    ).map((servicio) => ({
      ...servicio,
      nivel_prioridad: 1 as const,
      tipo_item: 'SERVICIO_EN_PROGRESO' as const,
    }));
    const programados = this.ordenarServiciosPorFecha(
      servicios_activos.filter((servicio) => servicio.estado === 'programado'),
    ).map((servicio) => ({
      ...servicio,
      nivel_prioridad: 2 as const,
      tipo_item: 'SERVICIO_PROGRAMADO' as const,
    }));
    const solicitudes_directas = propuestas_directas.map((propuesta) => ({
      ...propuesta,
      nivel_prioridad: 3 as const,
      tipo_item: 'SOLICITUD_DIRECTA' as const,
    }));
    const lista_unificada_ordenada = [
      ...en_progreso,
      ...programados,
      ...solicitudes_directas,
    ];

    return {
      total: lista_unificada_ordenada.length,
      en_progreso,
      programados,
      solicitudes_directas,
      lista_unificada_ordenada,
    };
  }

  /** Devuelve las postulaciones pendientes que el reparador ya envió. */
  async obtenerMisPostulaciones(id_reparador: number) {
    await this.obtenerPerfilReparador(id_reparador);

    return this.propuestaRepository.findPostulacionesEnviadasPendientes(
      id_reparador,
    );
  }

  /** Explora trabajos compatibles y excluye todos los que ya recibieron una propuesta del reparador. */
  async explorarTrabajosPublicos(id_reparador: number) {
    const perfil_del_reparador =
      await this.obtenerPerfilReparador(id_reparador);
    const ids_trabajos_con_propuesta =
      await this.propuestaRepository.findIdsTrabajosConPropuesta(id_reparador);
    const ids_trabajos_excluidos = ids_trabajos_con_propuesta.map(
      (propuesta) => propuesta.idTrabajo,
    );
    const ids_categorias = perfil_del_reparador.categoriaReparadors.map(
      (categoria_del_reparador) => categoria_del_reparador.idCategoria,
    );
    const zonas_del_reparador = perfil_del_reparador.zonaReparadors;

    if (ids_categorias.length === 0 || zonas_del_reparador.length === 0) {
      return [];
    }

    const trabajos_candidatos =
      await this.trabajoRepository.findTrabajosAbiertosExcluyendoIds(
        ids_categorias,
        ids_trabajos_excluidos,
      );

    return this.priorizarTrabajosPorCobertura(
      trabajos_candidatos,
      zonas_del_reparador,
    );
  }

  /** Ordena servicios por la fecha preferida del trabajo, dejando fechas vacías al final. */
  private ordenarServiciosPorFecha(
    servicios: readonly ServicioActivo[],
  ): ServicioActivo[] {
    return [...servicios].sort(
      (servicio_a, servicio_b) =>
        this.obtenerFechaProgramada(servicio_a) -
        this.obtenerFechaProgramada(servicio_b),
    );
  }

  /** Usa la fecha preferida del trabajo como referencia para ordenar compromisos. */
  private obtenerFechaProgramada(servicio: ServicioActivo): number {
    return (
      servicio.propuesta?.trabajo?.fechaPreferida?.getTime() ??
      Number.POSITIVE_INFINITY
    );
  }

  /** Comprueba que exista el perfil y devuelve sus categorías y zonas de cobertura. */
  private async obtenerPerfilReparador(id_reparador: number) {
    const perfil_del_reparador =
      await this.trabajoRepository.findReparadorConCategoriasYZonas(
        id_reparador,
      );

    if (!perfil_del_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    return perfil_del_reparador;
  }

  /** Comprueba que la cuenta exista y tenga asignado el rol de cliente. */
  private async validarCliente(id_cliente: number): Promise<void> {
    const usuario_existente =
      await this.usuarioRepository.findIdUsuario(id_cliente);

    if (!usuario_existente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const tiene_rol_cliente = await this.usuarioRepository.tieneRol(
      id_cliente,
      'cliente',
    );

    if (!tiene_rol_cliente) {
      throw new ForbiddenException(
        'La cuenta indicada no tiene el rol de cliente',
      );
    }
  }

  /** Rechaza identificadores duplicados o categorías que no existen. */
  private async validarCategorias(
    ids_categorias: readonly number[],
  ): Promise<void> {
    const ids_categorias_unicos = [...new Set(ids_categorias)];

    if (ids_categorias_unicos.length !== ids_categorias.length) {
      throw new BadRequestException(
        'La lista de categorías no puede contener identificadores duplicados',
      );
    }

    const ids_categorias_existentes =
      await this.trabajoRepository.findCategoriasExistentes(
        ids_categorias_unicos,
      );

    if (ids_categorias_existentes.length !== ids_categorias_unicos.length) {
      throw new BadRequestException(
        'Una o más categorías seleccionadas no existen',
      );
    }
  }

  /** Convierte el DTO de creación al modelo interno del repositorio. */
  private mapearDatosTrabajoCliente(
    datos_trabajo: CrearTrabajoAbiertoDto | CrearTrabajoDirectoDto,
  ): CrearTrabajoClienteData {
    const documentos_trabajo: DocumentoTrabajoData[] = (
      datos_trabajo.documentos ?? []
    ).map((documento) => ({
      tipoDocumento: documento.tipo_documento,
      ubucacionArchivo: documento.ubucacion_archivo,
      urlYN: documento.url_y_n,
    }));

    return {
      idCliente: datos_trabajo.id_cliente,
      direccion: datos_trabajo.direccion,
      latitud: datos_trabajo.latitud,
      longitud: datos_trabajo.longitud,
      titulo: datos_trabajo.titulo,
      descripcion: datos_trabajo.descripcion,
      fechaPreferida: new Date(datos_trabajo.fecha_preferida),
      categorias: datos_trabajo.categorias ?? [],
      documentos: documentos_trabajo,
    };
  }

  /** Reutiliza el cálculo geográfico para cualquiera de las bandejas públicas. */
  private priorizarTrabajosPorCobertura(
    trabajos_candidatos: readonly TrabajoAbierto[],
    zonas_del_reparador: readonly ZonaDeCobertura[],
  ) {
    return trabajos_candidatos
      .map((trabajo) =>
        this.agregarMetadatosDeCobertura(trabajo, zonas_del_reparador),
      )
      .filter((trabajo) => trabajo !== null)
      .sort(
        (trabajo_a, trabajo_b) =>
          trabajo_a.prioridad - trabajo_b.prioridad ||
          trabajo_a.distancia_metros - trabajo_b.distancia_metros,
      );
  }

  /** Descarta trabajos sin coordenadas o fuera de todos los radios configurados. */
  private agregarMetadatosDeCobertura(
    trabajo: TrabajoAbierto,
    zonas_del_reparador: readonly ZonaDeCobertura[],
  ) {
    if (trabajo.latitud === null || trabajo.longitud === null) {
      return null;
    }

    const latitud_trabajo = Number(trabajo.latitud);
    const longitud_trabajo = Number(trabajo.longitud);

    if (
      !Number.isFinite(latitud_trabajo) ||
      !Number.isFinite(longitud_trabajo)
    ) {
      return null;
    }

    const mejor_coincidencia = this.buscarMejorZona(
      latitud_trabajo,
      longitud_trabajo,
      zonas_del_reparador,
    );

    if (!mejor_coincidencia) {
      return null;
    }

    const { propuestas: cantidad_propuestas, ...datos_del_trabajo } = trabajo;

    return {
      ...datos_del_trabajo,
      cantidad_propuestas,
      ...mejor_coincidencia,
    };
  }

  /** Elige el anillo prioritario más cercano entre todos los puntos del reparador. */
  private buscarMejorZona(
    latitud_trabajo: number,
    longitud_trabajo: number,
    zonas_del_reparador: readonly ZonaDeCobertura[],
  ): CoincidenciaDeZona | null {
    let mejor_coincidencia: CoincidenciaDeZona | null = null;

    for (const zona_de_cobertura of zonas_del_reparador) {
      const distancia_metros = this.calcularDistanciaMetros(
        latitud_trabajo,
        longitud_trabajo,
        Number(zona_de_cobertura.latitud),
        Number(zona_de_cobertura.longitud),
      );
      const prioridad_del_anillo = this.determinarPrioridadCobertura(
        distancia_metros,
        zona_de_cobertura,
      );

      if (!prioridad_del_anillo) {
        continue;
      }

      const coincidencia_actual = {
        ...prioridad_del_anillo,
        distancia_metros,
        zona_coincidente: zona_de_cobertura.etiqueta,
      };

      if (
        !mejor_coincidencia ||
        coincidencia_actual.prioridad < mejor_coincidencia.prioridad ||
        (coincidencia_actual.prioridad === mejor_coincidencia.prioridad &&
          coincidencia_actual.distancia_metros <
            mejor_coincidencia.distancia_metros)
      ) {
        mejor_coincidencia = coincidencia_actual;
      }
    }

    return mejor_coincidencia;
  }

  /** Clasifica una distancia en los anillos verde, amarillo o rojo. */
  private determinarPrioridadCobertura(
    distancia_metros: number,
    zona_de_cobertura: ZonaDeCobertura,
  ): PrioridadCobertura | null {
    if (distancia_metros <= zona_de_cobertura.radioGood) {
      return { prioridad: 1, anillo_cobertura: 'VERDE' };
    }

    if (distancia_metros <= zona_de_cobertura.radioMedio) {
      return { prioridad: 2, anillo_cobertura: 'AMARILLO' };
    }

    if (distancia_metros <= zona_de_cobertura.radioBad) {
      return { prioridad: 3, anillo_cobertura: 'ROJO' };
    }

    return null;
  }

  /** Calcula la distancia entre dos coordenadas usando la fórmula de Haversine. */
  private calcularDistanciaMetros(
    latitud_origen: number,
    longitud_origen: number,
    latitud_destino: number,
    longitud_destino: number,
  ): number {
    const latitud_origen_radianes = this.gradosARadianes(latitud_origen);
    const latitud_destino_radianes = this.gradosARadianes(latitud_destino);
    const diferencia_latitud_radianes = this.gradosARadianes(
      latitud_destino - latitud_origen,
    );
    const diferencia_longitud_radianes = this.gradosARadianes(
      longitud_destino - longitud_origen,
    );
    const componente_haversine =
      Math.sin(diferencia_latitud_radianes / 2) ** 2 +
      Math.cos(latitud_origen_radianes) *
        Math.cos(latitud_destino_radianes) *
        Math.sin(diferencia_longitud_radianes / 2) ** 2;
    const componente_limitado = Math.min(1, Math.max(0, componente_haversine));

    return (
      2 *
      RADIO_TERRESTRE_METROS *
      Math.atan2(
        Math.sqrt(componente_limitado),
        Math.sqrt(1 - componente_limitado),
      )
    );
  }

  /** Convierte grados a radianes para operar con las funciones trigonométricas. */
  private gradosARadianes(grados: number): number {
    return (grados * Math.PI) / 180;
  }
}
