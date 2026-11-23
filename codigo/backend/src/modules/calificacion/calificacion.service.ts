import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicioRepository } from '../servicio/servicio.repository';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { CrearCalificacionDto } from './dto/create-calificacion.dto';
import { CalificacionRepository } from './calificacion.repository';

/** Valida participantes y reglas antes de guardar una calificación. */
@Injectable()
export class CalificacionService {
  constructor(
    private readonly calificacionRepository: CalificacionRepository,
    private readonly servicioRepository: ServicioRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Permite al cliente o administrador calificar al reparador de un servicio finalizado. */
  async crearCalificacion(datos_calificacion: CrearCalificacionDto) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        datos_calificacion.id_servicio,
      );

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    if (servicio.estado !== 'completado') {
      throw new BadRequestException(
        'Solo se puede calificar un servicio completado',
      );
    }

    const es_cliente_del_trabajo =
      datos_calificacion.id_evaluador === servicio.propuesta.trabajo.idCliente;
    const es_administrador =
      !es_cliente_del_trabajo &&
      (await this.usuarioRepository.esAdministrador(
        datos_calificacion.id_evaluador,
      ));

    if (!es_cliente_del_trabajo && !es_administrador) {
      throw new ForbiddenException(
        'Solo el cliente del trabajo o un administrador puede emitir una calificación',
      );
    }

    if (datos_calificacion.id_evaluado !== servicio.propuesta.idReparador) {
      throw new BadRequestException(
        'El usuario evaluado debe ser el reparador que ejecutó el servicio',
      );
    }

    if (datos_calificacion.id_evaluador === datos_calificacion.id_evaluado) {
      throw new BadRequestException(
        'El evaluador no puede calificarse a sí mismo',
      );
    }

    const calificacion_existente =
      await this.calificacionRepository.findByServicioAndEvaluador(
        datos_calificacion.id_servicio,
        datos_calificacion.id_evaluador,
      );

    if (calificacion_existente) {
      throw new ConflictException('El evaluador ya calificó este servicio');
    }

    return this.calificacionRepository.crearCalificacion({
      idServicio: datos_calificacion.id_servicio,
      idEvaluador: datos_calificacion.id_evaluador,
      idEvaluado: datos_calificacion.id_evaluado,
      puntuacion: datos_calificacion.puntuacion,
      comentario: datos_calificacion.comentario,
    });
  }

  /** Lista calificaciones junto a las personas y servicios relacionados. */
  listarTodos() {
    return this.calificacionRepository.findAll();
  }

  /** Busca una calificación y notifica cuando el identificador no existe. */
  async obtenerPorId(id_calificacion: number) {
    const calificacion =
      await this.calificacionRepository.findById(id_calificacion);

    if (!calificacion) {
      throw new NotFoundException('Calificación no encontrada');
    }

    return calificacion;
  }

  /** Devuelve las calificaciones recibidas y su promedio, si existen. */
  async listarPorReparador(id_reparador: number) {
    const calificaciones =
      await this.calificacionRepository.findByReparador(id_reparador);
    const total_puntuaciones = calificaciones.reduce(
      (suma, calificacion) => suma + calificacion.puntuacion,
      0,
    );

    return {
      id_reparador,
      total_calificaciones: calificaciones.length,
      promedio_puntuacion:
        calificaciones.length === 0
          ? null
          : Number((total_puntuaciones / calificaciones.length).toFixed(2)),
      calificaciones,
    };
  }
}
