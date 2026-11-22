import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';
import { PropuestaRepository } from './propuesta.repository';

/**
 * Agrupa las operaciones de propuesta.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class PropuestaService {
  constructor(private readonly propuestaRepository: PropuestaRepository) {}

  /** Retira solo postulaciones pendientes del reparador y de trabajos abiertos. */
  async retirarPostulacion(id_reparador: number, id_propuesta: number) {
    const propuesta = await this.propuestaRepository.findById(id_propuesta);

    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (propuesta.idReparador !== id_reparador) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta propuesta',
      );
    }

    if (
      propuesta.estado !== 'pendiente' ||
      !propuesta.trabajo ||
      propuesta.trabajo.tipoSolicitud !== 'abierta'
    ) {
      throw new BadRequestException(
        'Solo puedes retirar postulaciones que aún estén pendientes',
      );
    }

    const propuesta_retirada =
      await this.propuestaRepository.actualizarEstadoPropuesta(
        id_propuesta,
        'retirada',
      );

    if (!propuesta_retirada) {
      const propuesta_actual =
        await this.propuestaRepository.findById(id_propuesta);

      if (!propuesta_actual) {
        throw new NotFoundException('Propuesta no encontrada');
      }

      throw new BadRequestException(
        'Solo puedes retirar postulaciones que aún estén pendientes',
      );
    }

    return propuesta_retirada;
  }

  crear(_datosParaCrearPropuesta: CreatePropuestaDto) {
    return 'This action adds a new propuesta';
  }

  listarTodos() {
    return `This action returns all propuesta`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} propuesta`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarPropuesta: UpdatePropuestaDto,
  ) {
    return `This action updates a #${identificador} propuesta`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} propuesta`;
  }
}
