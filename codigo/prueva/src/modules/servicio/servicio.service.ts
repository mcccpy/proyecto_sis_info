import { Injectable } from '@nestjs/common';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

/**
 * Agrupa las operaciones de servicio.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class ServicioService {
  crear(_datosParaCrearServicio: CreateServicioDto) {
    return 'This action adds a new servicio';
  }

  listarTodos() {
    return `This action returns all servicio`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} servicio`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarServicio: UpdateServicioDto,
  ) {
    return `This action updates a #${identificador} servicio`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} servicio`;
  }
}
