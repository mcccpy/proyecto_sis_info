import { Injectable } from '@nestjs/common';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';

/**
 * Agrupa las operaciones de pago.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class PagoService {
  crear(_datosParaCrearPago: CreatePagoDto) {
    return 'This action adds a new pago';
  }

  listarTodos() {
    return `This action returns all pago`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} pago`;
  }

  actualizar(identificador: number, _datosParaActualizarPago: UpdatePagoDto) {
    return `This action updates a #${identificador} pago`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} pago`;
  }
}
