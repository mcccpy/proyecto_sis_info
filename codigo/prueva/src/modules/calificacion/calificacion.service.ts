import { Injectable } from '@nestjs/common';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { UpdateCalificacionDto } from './dto/update-calificacion.dto';

/**
 * Agrupa las operaciones de calificacion.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class CalificacionService {
  crear(_datosParaCrearCalificacion: CreateCalificacionDto) {
    return 'This action adds a new calificacion';
  }

  listarTodos() {
    return `This action returns all calificacion`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} calificacion`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarCalificacion: UpdateCalificacionDto,
  ) {
    return `This action updates a #${identificador} calificacion`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} calificacion`;
  }
}
