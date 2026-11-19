import { Injectable } from '@nestjs/common';
import { CreateZonaDto } from './dto/create-zona.dto';
import { UpdateZonaDto } from './dto/update-zona.dto';

/**
 * Agrupa las operaciones de zona.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class ZonaService {
  crear(_datosParaCrearZona: CreateZonaDto) {
    return 'This action adds a new zona';
  }

  listarTodos() {
    return `This action returns all zona`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} zona`;
  }

  actualizar(identificador: number, _datosParaActualizarZona: UpdateZonaDto) {
    return `This action updates a #${identificador} zona`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} zona`;
  }
}
