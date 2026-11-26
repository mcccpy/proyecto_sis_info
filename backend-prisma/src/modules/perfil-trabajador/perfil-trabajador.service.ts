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

  async actualizarPerfilCompleto(
    id_usuario: number,
    datos: UpdatePerfilTrabajadorDto,
  ) {
    const perfilActual =
      await this.perfilTrabajadorRepository.findByUsuarioIdWithDetails(
        id_usuario,
      );

    if (!perfilActual) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    const registroActual = perfilActual as unknown as Record<string, unknown>;
    const aniosActuales = Number(
      registroActual.experienciaAnios ?? registroActual.experiencia_anios ?? 0,
    ) || 0;

    let aniosCalculados =
      datos.experiencia_anios !== undefined
        ? Number(datos.experiencia_anios)
        : aniosActuales;

    if (datos.experiencia_anios === undefined && datos.experiencia) {
      const matchAnios = datos.experiencia.match(/(\d+)/);
      if (matchAnios) {
        aniosCalculados = Math.min(100, Math.max(0, Number(matchAnios[1])));
      }
    }

    await this.perfilTrabajadorRepository.updateExperienciaAnios(
      id_usuario,
      aniosCalculados,
    );

    const zonaTexto = datos.zona?.trim();
    if (zonaTexto) {
      await this.perfilTrabajadorRepository.upsertZonaEtiqueta(
        id_usuario,
        zonaTexto,
      );
    }

    const dispTexto = datos.disponibilidad?.trim();
    if (dispTexto) {
      await this.perfilTrabajadorRepository.upsertDisponibilidadResumen(
        id_usuario,
        dispTexto,
      );
    }

    if (datos.categoriaId && Number(datos.categoriaId) > 0) {
      await this.perfilTrabajadorRepository.setCategoriaUnica(
        id_usuario,
        Number(datos.categoriaId),
      );
    }

    const perfilRefrescado =
      await this.perfilTrabajadorRepository.findByUsuarioIdWithDetails(
        id_usuario,
      );
    const refrescadoObj = (perfilRefrescado ?? perfilActual) as unknown as Record<
      string,
      unknown
    >;

    return {
      ...refrescadoObj,
      experiencia: datos.experiencia?.trim() || String(refrescadoObj.experiencia ?? ''),
      zona: zonaTexto || String(refrescadoObj.zona ?? ''),
      disponibilidad: dispTexto || String(refrescadoObj.disponibilidad ?? ''),
      categoriaId:
        datos.categoriaId && Number(datos.categoriaId) > 0
          ? Number(datos.categoriaId)
          : undefined,
    };
  }
}

