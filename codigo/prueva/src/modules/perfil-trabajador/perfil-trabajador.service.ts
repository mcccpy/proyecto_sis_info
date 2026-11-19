import { Injectable } from '@nestjs/common';
import { CreatePerfilTrabajadorDto } from './dto/create-perfil-trabajador.dto';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';

/**
 * Agrupa las operaciones de perfil-trabajador.
 * La carga y revision de documentos del perfil todavia no estan implementadas.
 */
@Injectable()
export class PerfilTrabajadorService {
  crear(_datosParaCrearPerfilTrabajador: CreatePerfilTrabajadorDto) {
    return 'This action adds a new perfilTrabajador';
  }

  listarTodos() {
    return `This action returns all perfilTrabajador`;
  }

  obtenerPorId(identificador: number) {
    return `This action returns a #${identificador} perfilTrabajador`;
  }

  actualizar(
    identificador: number,
    _datosParaActualizarPerfilTrabajador: UpdatePerfilTrabajadorDto,
  ) {
    return `This action updates a #${identificador} perfilTrabajador`;
  }

  eliminar(identificador: number) {
    return `This action removes a #${identificador} perfilTrabajador`;
  }
}
