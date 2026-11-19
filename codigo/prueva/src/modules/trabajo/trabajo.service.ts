import { Injectable } from '@nestjs/common';
import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';

/**
 * Agrupa las operaciones de trabajo.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class TrabajoService {
  crear(_datosParaCrearTrabajo: CreateTrabajoDto) {
    return 'This action adds a new trabajo';
  }

  listarTodos() {
    return `This action returns all trabajo`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} trabajo`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarTrabajo: UpdateTrabajoDto,
  ) {
    return `This action updates a #${identificador} trabajo`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} trabajo`;
  }
}
