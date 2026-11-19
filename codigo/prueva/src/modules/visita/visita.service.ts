import { Injectable } from '@nestjs/common';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { UpdateVisitaDto } from './dto/update-visita.dto';

/**
 * Agrupa las operaciones de visita.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class VisitaService {
  crear(_datosParaCrearVisita: CreateVisitaDto) {
    return 'This action adds a new visita';
  }

  listarTodos() {
    return `This action returns all visita`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} visita`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarVisita: UpdateVisitaDto,
  ) {
    return `This action updates a #${identificador} visita`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} visita`;
  }
}
