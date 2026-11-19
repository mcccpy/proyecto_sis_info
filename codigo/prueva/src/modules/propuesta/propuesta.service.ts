import { Injectable } from '@nestjs/common';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';

/**
 * Agrupa las operaciones de propuesta.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class PropuestaService {
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
