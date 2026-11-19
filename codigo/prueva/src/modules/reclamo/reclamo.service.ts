import { Injectable } from '@nestjs/common';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { UpdateReclamoDto } from './dto/update-reclamo.dto';

/**
 * Agrupa las operaciones de reclamo.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class ReclamoService {
  crear(_datosParaCrearReclamo: CreateReclamoDto) {
    return 'This action adds a new reclamo';
  }

  listarTodos() {
    return `This action returns all reclamo`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} reclamo`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarReclamo: UpdateReclamoDto,
  ) {
    return `This action updates a #${identificador} reclamo`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} reclamo`;
  }
}
