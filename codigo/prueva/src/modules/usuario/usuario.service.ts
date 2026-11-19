import { Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

/**
 * Agrupa las operaciones de usuario.
 * El registro de clientes/reparadores y la asignacion de roles todavia no estan implementados.
 */
@Injectable()
export class UsuarioService {
  crear(_datosParaCrearUsuario: CreateUsuarioDto) {
    return 'This action adds a new usuario';
  }

  listarTodos() {
    return `This action returns all usuario`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} usuario`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarUsuario: UpdateUsuarioDto,
  ) {
    return `This action updates a #${identificador} usuario`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} usuario`;
  }
}
