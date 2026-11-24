import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicioRepository } from '../servicio/servicio.repository';
import { ServicioService } from '../servicio/servicio.service';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { MARCADOR_SOLICITUD_CANCELACION_REPARADOR } from './reclamo.constants';
import { CrearReclamoDto } from './dto/create-reclamo.dto';
import { ResolverReclamoAdminDto } from './dto/resolver-reclamo-admin.dto';
import type { FiltroBandejaReclamosAdminDto } from './dto/filtro-bandeja-reclamos-admin.dto';
import { ReclamoRepository } from './reclamo.repository';

const DURACION_MAXIMA_RECLAMO_MS = 60 * 24 * 60 * 60 * 1000;

/** Coordina la apertura de reclamos y su resolución por administradores. */
@Injectable()
export class ReclamoService {
  constructor(
    private readonly reclamoRepository: ReclamoRepository,
    private readonly servicioRepository: ServicioRepository,
    private readonly servicioService: ServicioService,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Abre un reclamo solo a participantes del servicio y dentro del plazo permitido. */
  async abrirReclamo(datos_reclamo: CrearReclamoDto) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        datos_reclamo.id_servicio,
      );

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    const es_cliente_del_trabajo =
      datos_reclamo.id_usuario === servicio.propuesta.trabajo.idCliente;
    const es_reparador_asignado =
      datos_reclamo.id_usuario === servicio.propuesta.idReparador;

    if (!es_cliente_del_trabajo && !es_reparador_asignado) {
      throw new ForbiddenException(
        'Solo el cliente o el reparador asignado pueden abrir un reclamo',
      );
    }

    const fecha_finalizacion = servicio.fechaFinalizacion;

    if (
      fecha_finalizacion &&
      Date.now() - fecha_finalizacion.getTime() > DURACION_MAXIMA_RECLAMO_MS
    ) {
      throw new BadRequestException(
        'El plazo máximo de 2 meses (60 días) desde la finalización del servicio ha expirado',
      );
    }

    return this.reclamoRepository.crearReclamo({
      idServicio: datos_reclamo.id_servicio,
      idUsuario: datos_reclamo.id_usuario,
      motivo: datos_reclamo.motivo,
    });
  }

  /** Devuelve reclamos e historial de acciones asociados a un servicio. */
  async listarPorServicio(id_servicio: number, id_usuario: number) {
    await this.validarAccesoServicio(id_servicio, id_usuario);
    return this.reclamoRepository.findByServicio(id_servicio);
  }

  /** Lista reclamos para el panel después de validar el acceso administrativo. */
  async listarReclamosAdmin(filtros: FiltroBandejaReclamosAdminDto) {
    const es_administrador = await this.usuarioRepository.esAdministrador(
      filtros.id_admin,
    );

    if (!es_administrador) {
      throw new ForbiddenException(
        'Solo un administrador puede consultar la bandeja de reclamos',
      );
    }

    return this.reclamoRepository.findBandejaAdmin(filtros.estado);
  }

  /** Registra una acción administrativa y cambia el estado del reclamo. */
  async gestionarReclamoAdmin(
    id_reclamo: number,
    datos_resolucion: ResolverReclamoAdminDto,
  ) {
    const es_administrador = await this.usuarioRepository.esAdministrador(
      datos_resolucion.id_soporte,
    );

    if (!es_administrador) {
      throw new ForbiddenException(
        'Únicamente un administrador puede gestionar y resolver reclamos',
      );
    }

    const reclamo_existente =
      await this.reclamoRepository.findByIdWithAcciones(id_reclamo);

    if (!reclamo_existente) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    if (
      reclamo_existente.motivo.startsWith(
        MARCADOR_SOLICITUD_CANCELACION_REPARADOR,
      ) &&
      datos_resolucion.estado === 'resuelto'
    ) {
      if (!reclamo_existente.servicio) {
        throw new NotFoundException(
          'No se encontró el servicio de la solicitud de cancelación',
        );
      }

      await this.servicioService.aprobarCancelacionSolicitada(
        reclamo_existente.idServicio,
        id_reclamo,
        reclamo_existente.idUsuario,
        reclamo_existente.motivo.replace(
          `${MARCADOR_SOLICITUD_CANCELACION_REPARADOR} `,
          '',
        ),
      );
    }

    const reclamo_actualizado = await this.reclamoRepository.gestionarReclamo(
      id_reclamo,
      {
        idReclamo: id_reclamo,
        idSoporte: datos_resolucion.id_soporte,
        descripcion: datos_resolucion.descripcion,
      },
      datos_resolucion.estado,
      reclamo_existente.motivo.startsWith(
        MARCADOR_SOLICITUD_CANCELACION_REPARADOR,
      )
        ? reclamo_existente.motivo.replace(
            `${MARCADOR_SOLICITUD_CANCELACION_REPARADOR} `,
            '',
          )
        : undefined,
    );

    if (!reclamo_actualizado) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    return reclamo_actualizado;
  }

  /** Lista reclamos con sus acciones, reclamantes y servicios. */
  listarTodos() {
    return this.reclamoRepository.findAll();
  }

  /** Busca un reclamo con su historial de acciones. */
  async obtenerPorId(id_reclamo: number, id_usuario: number) {
    const reclamo =
      await this.reclamoRepository.findByIdWithAcciones(id_reclamo);

    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    const propuesta = reclamo.servicio?.propuesta;
    const es_cliente =
      propuesta?.trabajo?.idCliente === id_usuario;
    const es_reparador = propuesta?.idReparador === id_usuario;
    const es_administrador =
      await this.usuarioRepository.esAdministrador(id_usuario);
    if (!es_cliente && !es_reparador && !es_administrador) {
      throw new ForbiddenException(
        'Solo los participantes o un administrador pueden consultar este reclamo',
      );
    }

    return reclamo;
  }

  /** Comprueba acceso antes de listar reclamaciones asociadas a un servicio. */
  private async validarAccesoServicio(
    id_servicio: number,
    id_usuario: number,
  ): Promise<void> {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        id_servicio,
      );
    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const es_cliente =
      servicio.propuesta?.trabajo.idCliente === id_usuario;
    const es_reparador = servicio.propuesta?.idReparador === id_usuario;
    const es_administrador =
      await this.usuarioRepository.esAdministrador(id_usuario);
    if (!es_cliente && !es_reparador && !es_administrador) {
      throw new ForbiddenException(
        'Solo los participantes o un administrador pueden consultar los reclamos',
      );
    }
  }
}
