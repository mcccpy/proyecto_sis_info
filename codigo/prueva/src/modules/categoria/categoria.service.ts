import { Injectable } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

/**
 * Agrupa las operaciones de categoria.
 * Las respuestas actuales son plantillas y aun no consultan ni guardan datos con Prisma.
 */
@Injectable()
export class CategoriaService {
  crear(_datosParaCrearCategoria: CreateCategoriaDto) {
    return 'This action adds a new categoria';
  }

  listarTodos() {
    return `This action returns all categoria`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} categoria`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarCategoria: UpdateCategoriaDto,
  ) {
    return `This action updates a #${identificador} categoria`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} categoria`;
  }
}
