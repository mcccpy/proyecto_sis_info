import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilTrabajadorRepository } from '../perfil-trabajador/perfil-trabajador.repository';
import { CreateZonaReparadorDto } from './dto/create-zona-reparador.dto';
import { UpdateZonaReparadorDto } from './dto/update-zona-reparador.dto';
import { radiosCumplenJerarquia } from './zona-radios.util';
import { ZonaRepository } from './zona.repository';
import type { ZonaReparadorData } from './zona.repository';

const MAXIMO_ZONAS_POR_REPARADOR = 3;
const MENSAJE_RADIOS_INVALIDOS =
  'Los radios deben cumplir: radio_good < radio_medio < radio_bad';

/** Aplica las reglas para consultar y administrar zonas de cobertura. */
@Injectable()
export class ZonaService {
  constructor(
    private readonly zonaRepository: ZonaRepository,
    private readonly perfilTrabajadorRepository: PerfilTrabajadorRepository,
  ) {}

  /** Lista las zonas e indica si todavía se permite agregar otra. */
  async listarZonas(id_reparador: number) {
    await this.obtenerPerfilReparador(id_reparador);
    const zonas_del_reparador =
      await this.zonaRepository.findAllByReparador(id_reparador);

    return {
      zonas: zonas_del_reparador,
      puede_agregar_mas:
        zonas_del_reparador.length < MAXIMO_ZONAS_POR_REPARADOR,
    };
  }

  /** Agrega una nueva zona si el perfil no superó el máximo permitido. */
  async agregarZona(id_reparador: number, datos_zona: CreateZonaReparadorDto) {
    return this.zonaRepository.ejecutarEnTransaccion(async (query_context) => {
      const perfil_del_reparador =
        await this.zonaRepository.bloquearPerfilReparador(
          id_reparador,
          query_context,
        );

      if (!perfil_del_reparador) {
        throw new NotFoundException('Perfil de reparador no encontrado');
      }

      const cantidad_zonas_actuales =
        await this.zonaRepository.countByReparador(id_reparador, query_context);

      if (cantidad_zonas_actuales >= MAXIMO_ZONAS_POR_REPARADOR) {
        throw new BadRequestException(
          'Has alcanzado el límite máximo de 3 zonas fijas. Elimina o edita una existente',
        );
      }

      this.validarJerarquiaRadios(datos_zona);

      return this.zonaRepository.createZona(
        id_reparador,
        this.mapearDatosZona(datos_zona),
        query_context,
      );
    });
  }

  /** Verifica propiedad y valida los radios usando los valores actuales no enviados. */
  async editarZona(
    id_reparador: number,
    id_zona: number,
    datos_actualizados: UpdateZonaReparadorDto,
  ) {
    if (Object.keys(datos_actualizados).length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar la zona',
      );
    }

    const zona_actual = await this.obtenerZonaDelReparador(
      id_reparador,
      id_zona,
    );
    const zona_completa = {
      radio_good: datos_actualizados.radio_good ?? zona_actual.radioGood,
      radio_medio: datos_actualizados.radio_medio ?? zona_actual.radioMedio,
      radio_bad: datos_actualizados.radio_bad ?? zona_actual.radioBad,
    };

    this.validarJerarquiaRadios(zona_completa);

    const zona_actualizada = await this.zonaRepository.updateZona(
      id_zona,
      this.mapearCambiosZona(datos_actualizados),
    );

    if (!zona_actualizada) {
      throw new NotFoundException('Zona de cobertura no encontrada');
    }

    return zona_actualizada;
  }

  /** Elimina una zona existente que pertenezca al reparador indicado. */
  async eliminarZona(id_reparador: number, id_zona: number) {
    await this.obtenerZonaDelReparador(id_reparador, id_zona);

    const zona_eliminada = await this.zonaRepository.deleteZona(id_zona);

    if (!zona_eliminada) {
      throw new NotFoundException('Zona de cobertura no encontrada');
    }

    return zona_eliminada;
  }

  /** Lista todas las zonas de cobertura registradas. */
  listarTodos() {
    return this.zonaRepository.findAll();
  }

  /** Busca una zona y notifica cuando el identificador no existe. */
  async obtenerPorId(id_zona: number) {
    const zona = await this.zonaRepository.findByIdWithPerfil(id_zona);

    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    return zona;
  }

  /** Busca el perfil antes de permitir operaciones sobre sus zonas. */
  private async obtenerPerfilReparador(id_reparador: number) {
    const perfil_trabajador =
      await this.perfilTrabajadorRepository.findByUsuarioId(id_reparador);

    if (!perfil_trabajador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    return perfil_trabajador;
  }

  /** Confirma que la zona exista y pertenezca al perfil solicitado. */
  private async obtenerZonaDelReparador(id_reparador: number, id_zona: number) {
    const zona_actual = await this.zonaRepository.findById(id_zona);

    if (!zona_actual) {
      throw new NotFoundException('Zona de cobertura no encontrada');
    }

    if (zona_actual.idReparador !== id_reparador) {
      throw new ForbiddenException(
        'La zona de cobertura no pertenece a este reparador',
      );
    }

    return zona_actual;
  }

  /** Rechaza radios que no formen anillos de cobertura crecientes. */
  private validarJerarquiaRadios(zona: {
    radio_good: number;
    radio_medio: number;
    radio_bad: number;
  }): void {
    if (!radiosCumplenJerarquia(zona)) {
      throw new BadRequestException(MENSAJE_RADIOS_INVALIDOS);
    }
  }

  /** Convierte los nombres HTTP a los campos que espera Prisma. */
  private mapearDatosZona(
    datos_zona: CreateZonaReparadorDto,
  ): ZonaReparadorData {
    return {
      etiqueta: datos_zona.etiqueta,
      latitud: datos_zona.latitud.toString(),
      longitud: datos_zona.longitud.toString(),
      radioGood: datos_zona.radio_good,
      radioMedio: datos_zona.radio_medio,
      radioBad: datos_zona.radio_bad,
    };
  }

  /** Mantiene el DTO parcial y omite propiedades que el cliente no envió. */
  private mapearCambiosZona(
    datos_actualizados: UpdateZonaReparadorDto,
  ): Partial<ZonaReparadorData> {
    return {
      ...(datos_actualizados.etiqueta !== undefined && {
        etiqueta: datos_actualizados.etiqueta,
      }),
      ...(datos_actualizados.latitud !== undefined && {
        latitud: datos_actualizados.latitud.toString(),
      }),
      ...(datos_actualizados.longitud !== undefined && {
        longitud: datos_actualizados.longitud.toString(),
      }),
      ...(datos_actualizados.radio_good !== undefined && {
        radioGood: datos_actualizados.radio_good,
      }),
      ...(datos_actualizados.radio_medio !== undefined && {
        radioMedio: datos_actualizados.radio_medio,
      }),
      ...(datos_actualizados.radio_bad !== undefined && {
        radioBad: datos_actualizados.radio_bad,
      }),
    };
  }
}
