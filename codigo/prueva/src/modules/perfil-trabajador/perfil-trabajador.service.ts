import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';
import { PerfilTrabajadorRepository } from './perfil-trabajador.repository';

/**
 * Coordina la consulta y actualización de perfiles profesionales.
 */
@Injectable()
export class PerfilTrabajadorService {
  constructor(
    private readonly perfilTrabajadorRepository: PerfilTrabajadorRepository,
  ) {}

  /** Lista perfiles existentes con sus relaciones profesionales. */
  listarTodos() {
    return this.perfilTrabajadorRepository.findAll();
  }

  /** Busca un perfil por el identificador de su usuario. */
  async obtenerPorId(id_usuario: number) {
    const perfil =
      await this.perfilTrabajadorRepository.findByUsuarioIdWithDetails(
        id_usuario,
      );

    if (!perfil) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    return perfil;
  }

  /** Actualiza la experiencia del perfil existente. */
  async actualizar(
    id_usuario: number,
    datos_actualizados: UpdatePerfilTrabajadorDto,
  ) {
    if (datos_actualizados.experiencia_anios === undefined) {
      throw new BadRequestException(
        'Debes enviar la experiencia en años para actualizar el perfil',
      );
    }

    const perfil_actualizado =
      await this.perfilTrabajadorRepository.updateExperienciaAnios(
        id_usuario,
        datos_actualizados.experiencia_anios,
      );

    if (!perfil_actualizado) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    return perfil_actualizado;
  }
}
