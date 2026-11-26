import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearIncrementoPresupuestoData {
  idServicio: number;
  idSolicitante: number;
  montoAnterior: string;
  montoNuevo: string;
  motivo: string;
}

export interface ActualizarDictamenIncrementoData {
  idIncremento: number;
  idPropuesta: number;
  estadoAprobacion: 'aprobado' | 'rechazado';
  fechaRespuesta: Date;
  montoNuevo: string;
}

/** Consulta los servicios activos asignados a un reparador. */
@Injectable()
export class ServicioRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista servicios y las relaciones previstas para el panel de consulta. */
  findAll() {
    return this.prisma.db.orm.public.Servicio.include(
      'propuesta',
      (propuesta) => propuesta.include('trabajo'),
    )
      .include('visitas')
      .include('pagos')
      .include('incrementoPresupuestos')
      .all();
  }

  /** Busca el detalle completo de un servicio y sus relaciones operativas. */
  findByIdWithDetails(id_servicio: number) {
    return this.prisma.db.orm.public.Servicio.include(
      'propuesta',
      (propuesta) => propuesta.include('trabajo'),
    )
      .include('visitas')
      .include('pagos')
      .include('incrementoPresupuestos')
      .include('calificacions')
      .include('reclamos', (reclamos) => reclamos.include('reclamoAccions'))
      .where({ idServicio: id_servicio })
      .first();
  }

  /** Obtiene un servicio con la propuesta y el trabajo que lo originaron. */
  findByIdWithPropuestaAndTrabajo(id_servicio: number) {
    return this.prisma.db.orm.public.Servicio.include(
      'propuesta',
      (propuesta) => propuesta.include('trabajo'),
    )
      .where({ idServicio: id_servicio })
      .first();
  }

  /** Obtiene un servicio junto a su propuesta y los pagos asociados. */
  findByIdWithPropuestaAndPagos(id_servicio: number) {
    return this.prisma.db.orm.public.Servicio.include('propuesta')
      .include('pagos')
      .where({ idServicio: id_servicio })
      .first();
  }

  /** Obtiene un incremento junto al servicio y la propuesta cuyo precio podría cambiar. */
  findIncrementoPresupuestoById(id_incremento: number) {
    return this.prisma.db.orm.public.IncrementoPresupuesto.include(
      'servicio',
      (servicio) => servicio.include('propuesta'),
    )
      .where({ idIncremento: id_incremento })
      .first();
  }

  /** Guarda una solicitud de incremento pendiente. */
  crearIncrementoPendiente(datos_incremento: CrearIncrementoPresupuestoData) {
    return this.prisma.db.orm.public.IncrementoPresupuesto.create({
      ...datos_incremento,
      estadoAprobacion: 'pendiente',
    });
  }

  /** Registra una disminución aprobada y cambia el precio dentro de una transacción. */
  registrarDisminucionPresupuesto(
    datos_incremento: CrearIncrementoPresupuestoData,
    id_propuesta: number,
    fecha_respuesta: Date,
  ) {
    return this.prisma.db.transaction((transaccion) =>
      this.registrarDisminucionEnTransaccion(
        datos_incremento,
        id_propuesta,
        fecha_respuesta,
        transaccion,
      ),
    );
  }

  /** Aplica el dictamen administrativo y, si se aprueba, actualiza el precio vigente. */
  actualizarDictamenIncremento(
    datos_dictamen: ActualizarDictamenIncrementoData,
  ) {
    return this.prisma.db.transaction(async (transaccion) => {
      const incremento_actualizado =
        await transaccion.orm.public.IncrementoPresupuesto.where({
          idIncremento: datos_dictamen.idIncremento,
          estadoAprobacion: 'pendiente',
        }).update({
          estadoAprobacion: datos_dictamen.estadoAprobacion,
          fechaRespuesta: datos_dictamen.fechaRespuesta,
        });

      if (!incremento_actualizado) {
        return null;
      }

      if (datos_dictamen.estadoAprobacion === 'aprobado') {
        const propuesta_actualizada =
          await transaccion.orm.public.Propuesta.where({
            idPropuesta: datos_dictamen.idPropuesta,
          }).update({ precioTotal: datos_dictamen.montoNuevo });

        if (!propuesta_actualizada) {
          throw new Error(
            `No se pudo actualizar la propuesta ${datos_dictamen.idPropuesta} al aprobar el incremento.`,
          );
        }
      }

      return incremento_actualizado;
    });
  }

  /** Lista incrementos pendientes en orden FIFO con su contexto de atención. */
  findIncrementosPendientesAdmin() {
    return this.prisma.db.orm.public.IncrementoPresupuesto.where({
      estadoAprobacion: 'pendiente',
    })
      .include('servicio', (servicio) =>
        servicio.include('propuesta', (propuesta) =>
          propuesta.include('trabajo', (trabajo) =>
            trabajo.select('idTrabajo', 'titulo'),
          ),
        ),
      )
      .include('usuario', (usuario_solicitante) =>
        usuario_solicitante.select('idUsuario', 'nombre', 'email'),
      )
      .orderBy((incremento) => incremento.fechaSolicitud.asc())
      .all();
  }

  /** Completa un servicio activo después de validar sus reglas en el servicio de dominio. */
  completarServicio(id_servicio: number, fecha_finalizacion: Date) {
    return this.prisma.db.orm.public.Servicio.where({
      idServicio: id_servicio,
    })
      .where((servicio) => servicio.estado.in(['programado', 'en_progreso']))
      .update({
        estado: 'completado',
        fechaFinalizacion: fecha_finalizacion,
      });
  }

  /** Registra una nota técnica manual vinculada al trabajo del servicio. */
  crearNotaTecnica(
    id_trabajo: number,
    id_servicio: number,
    id_usuario: number,
    detalle: string,
  ) {
    return this.prisma.db.orm.public.EventoTrabajo.create({
      idTrabajo: id_trabajo,
      idServicio: id_servicio,
      idUsuario: id_usuario,
      tipoEvento: 'NOTA_REPARADOR',
      detalle,
    });
  }

  /** Obtiene todos los eventos del trabajo en orden cronológico ascendente. */
  findBitacoraByTrabajo(id_trabajo: number) {
    return this.prisma.db.orm.public.EventoTrabajo.where({
      idTrabajo: id_trabajo,
    })
      .include('usuario')
      .orderBy((evento) => evento.fechaEvento.asc())
      .all();
  }

  /** Busca un trabajo con sus propuestas y datos del reparador asignado. */
  findTrabajoByIdWithPropuestas(id_trabajo: number) {
    return this.prisma.db.orm.public.Trabajo.where({
      idTrabajo: id_trabajo,
      deletedAt: null,
    })
      .include('propuestas', (propuestas) =>
        propuestas.include('servicio'),
      )
      .first();
  }

  /** Cancela un servicio activo y devuelve sus relaciones operativas actualizadas. */
  async cancelarServicio(id_servicio: number) {
    const servicio_actualizado =
      await this.prisma.db.orm.public.Servicio.where({
        idServicio: id_servicio,
      })
        .where((servicio) =>
          servicio.estado.in(['programado', 'en_progreso']),
        )
        .update({ estado: 'cancelado' });

    if (!servicio_actualizado) {
      return null;
    }

    return this.findByIdWithDetails(id_servicio);
  }

  /** Actualiza el precio y crea el registro de disminución en una transacción. */
  private async registrarDisminucionEnTransaccion(
    datos_incremento: CrearIncrementoPresupuestoData,
    id_propuesta: number,
    fecha_respuesta: Date,
    query_context: PrismaQueryContext,
  ) {
    const propuesta_actualizada =
      await query_context.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
      }).update({ precioTotal: datos_incremento.montoNuevo });

    if (!propuesta_actualizada) {
      return null;
    }

    return query_context.orm.public.IncrementoPresupuesto.create({
      ...datos_incremento,
      estadoAprobacion: 'aprobado',
      fechaRespuesta: fecha_respuesta,
    });
  }

  /** Incluye trabajo, datos públicos del cliente y categorías de cada servicio. */
  async findServiciosActivosByReparador(id_reparador: number) {
    const propuestas_del_reparador =
      await this.prisma.db.orm.public.Propuesta.where({
        idReparador: id_reparador,
      })
        .select('idPropuesta')
        .all();
    const ids_propuestas = propuestas_del_reparador.map(
      (propuesta) => propuesta.idPropuesta,
    );

    if (ids_propuestas.length === 0) {
      return [];
    }

    return this.prisma.db.orm.public.Servicio.where((servicio) =>
      servicio.idPropuesta.in(ids_propuestas),
    )
      .where((servicio) => servicio.estado.in(['en_progreso', 'programado']))
      .include('propuesta', (propuesta) =>
        propuesta.include('trabajo', (trabajo) =>
          trabajo
            .include('usuario', (usuario_cliente) =>
              usuario_cliente.select('idUsuario', 'nombre'),
            )
            .include('categoriaTrabajos', (categorias_del_trabajo) =>
              categorias_del_trabajo.include('categoria'),
            ),
        ),
      )
      .all();
  }
}
