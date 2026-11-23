import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Campos normalizados de una zona antes de enviarlos a Prisma. */
export interface ZonaReparadorData {
  etiqueta: string;
  latitud: string;
  longitud: string;
  radioGood: number;
  radioMedio: number;
  radioBad: number;
}

/** Ejecuta las consultas de persistencia sobre las zonas de cobertura. */
@Injectable()
export class ZonaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista zonas e incluye datos básicos del perfil que las administra. */
  findAll() {
    return this.prisma.db.orm.public.ZonaReparador.include(
      'perfilTrabajador',
      (perfil) => perfil.include('usuario'),
    ).all();
  }

  /** Busca una zona por su identificador principal. */
  findByIdWithPerfil(id_zona: number) {
    return this.prisma.db.orm.public.ZonaReparador.include(
      'perfilTrabajador',
      (perfil) => perfil.include('usuario'),
    )
      .where({ idZonaRep: id_zona })
      .first();
  }

  /** Lista los puntos de cobertura registrados para un reparador. */
  findAllByReparador(
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.ZonaReparador.where({
      idReparador: id_reparador,
    }).all();
  }

  /** Cuenta las zonas actuales; el límite pequeño permite contar las filas leídas. */
  async countByReparador(
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ): Promise<number> {
    const zonas_del_reparador = await this.findAllByReparador(
      id_reparador,
      query_context,
    );

    return zonas_del_reparador.length;
  }

  /** Bloquea el perfil durante la comprobación e inserción del límite de zonas. */
  bloquearPerfilReparador(
    id_reparador: number,
    query_context: PrismaQueryContext,
  ) {
    return query_context.orm.public.PerfilTrabajador.where({
      idUsuario: id_reparador,
    })
      .forUpdate()
      .first();
  }

  /** Busca un punto por su identificador principal. */
  findById(
    id_zona: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.ZonaReparador.where({
      idZonaRep: id_zona,
    }).first();
  }

  /** Inserta un punto de cobertura asociado al perfil indicado. */
  createZona(
    id_reparador: number,
    datos_zona: ZonaReparadorData,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.ZonaReparador.create({
      idReparador: id_reparador,
      ...datos_zona,
    });
  }

  /** Actualiza únicamente los campos proporcionados para la zona. */
  updateZona(
    id_zona: number,
    datos_actualizados: Partial<ZonaReparadorData>,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.ZonaReparador.where({
      idZonaRep: id_zona,
    }).update(datos_actualizados);
  }

  /** Elimina el punto de cobertura indicado. */
  deleteZona(
    id_zona: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.ZonaReparador.where({
      idZonaRep: id_zona,
    }).delete();
  }

  /** Ejecuta una operación indivisible para no sobrepasar el límite por concurrencia. */
  ejecutarEnTransaccion<T>(
    operacion: (query_context: PrismaQueryContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.db.transaction((transaccion) => operacion(transaccion));
  }
}
