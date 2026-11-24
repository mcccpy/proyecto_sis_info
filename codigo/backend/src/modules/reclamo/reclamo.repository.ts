import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearReclamoData {
  idServicio: number;
  idUsuario: number;
  motivo: string;
}

export interface CrearAccionReclamoData {
  idReclamo: number;
  idSoporte: number;
  descripcion: string;
}

/** Ejecuta consultas y transacciones relacionadas con reclamos y sus acciones. */
@Injectable()
export class ReclamoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista reclamos con historial, reclamante y servicio asociado. */
  findAll() {
    return this.prisma.db.orm.public.Reclamo.include('reclamoAccions')
      .include('usuario')
      .include('servicio')
      .orderBy((reclamo) => reclamo.fechaCreacion.desc())
      .all();
  }

  /** Lista los reclamos de un servicio junto a su historial administrativo. */
  findByServicio(id_servicio: number) {
    return this.prisma.db.orm.public.Reclamo.where({
      idServicio: id_servicio,
    })
      .include('reclamoAccions')
      .orderBy((reclamo) => reclamo.fechaCreacion.desc())
      .all();
  }

  /** Lista la bandeja priorizando reclamos activos y luego los ya resueltos. */
  async findBandejaAdmin(
    estado?: 'abierto' | 'en_revision' | 'resuelto' | 'rechazado',
  ) {
    if (estado) {
      return this.crearConsultaBandejaAdmin()
        .where({ estado })
        .orderBy((reclamo) => reclamo.fechaCreacion.desc())
        .all();
    }

    const [reclamos_activos, reclamos_cerrados] = await Promise.all([
      this.crearConsultaBandejaAdmin()
        .where((reclamo) => reclamo.estado.in(['abierto', 'en_revision']))
        .orderBy((reclamo) => reclamo.fechaCreacion.desc())
        .all(),
      this.crearConsultaBandejaAdmin()
        .where((reclamo) => reclamo.estado.in(['resuelto', 'rechazado']))
        .orderBy((reclamo) => reclamo.fechaCreacion.desc())
        .all(),
    ]);

    return [...reclamos_activos, ...reclamos_cerrados];
  }

  /** Busca un reclamo con todas las acciones registradas. */
  findByIdWithAcciones(id_reclamo: number) {
    return this.prisma.db.orm.public.Reclamo.include('reclamoAccions')
      .include('servicio', (servicio) =>
        servicio.include('propuesta', (propuesta) =>
          propuesta.include('trabajo'),
        ),
      )
      .where({ idReclamo: id_reclamo })
      .first();
  }

  /** Abre un reclamo con el estado inicial definido por el contrato de datos. */
  crearReclamo(datos_reclamo: CrearReclamoData) {
    return this.prisma.db.orm.public.Reclamo.create({
      ...datos_reclamo,
      estado: 'abierto',
    });
  }

  /** Registra la acción y cambia el estado del reclamo de forma atómica. */
  gestionarReclamo(
    id_reclamo: number,
    datos_accion: CrearAccionReclamoData,
    estado_reclamo: 'en_revision' | 'resuelto' | 'rechazado',
    motivo_reclamo?: string,
  ) {
    return this.prisma.db.transaction(async (transaccion) => {
      const reclamo_actualizado = await transaccion.orm.public.Reclamo.where({
        idReclamo: id_reclamo,
      }).update({
        estado: estado_reclamo,
        ...(motivo_reclamo !== undefined && { motivo: motivo_reclamo }),
      });

      if (!reclamo_actualizado) {
        return null;
      }

      await transaccion.orm.public.ReclamoAccion.create(datos_accion);

      return transaccion.orm.public.Reclamo.include('reclamoAccions')
        .where({ idReclamo: id_reclamo })
        .first();
    });
  }

  /** Construye la consulta con los datos relacionados que requiere el panel. */
  private crearConsultaBandejaAdmin() {
    return this.prisma.db.orm.public.Reclamo.include(
      'reclamoAccions',
      (acciones) =>
        acciones.select('idReclamo', 'idSoporte', 'descripcion', 'fechaAccion'),
    )
      .include('usuario', (usuario_reclamante) =>
        usuario_reclamante.select('idUsuario', 'nombre', 'email'),
      )
      .include('servicio', (servicio) =>
        servicio.include('propuesta', (propuesta) =>
          propuesta.include('trabajo', (trabajo) =>
            trabajo.select('idTrabajo', 'titulo'),
          ),
        ),
      );
  }
}
