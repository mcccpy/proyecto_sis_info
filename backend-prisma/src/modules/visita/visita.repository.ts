import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearVisitaData {
  fechaInicio: Date;
  fechaFin: Date;
}

/** Ejecuta consultas y escrituras transaccionales sobre las visitas. */
@Injectable()
export class VisitaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista visitas junto al servicio al que pertenecen. */
  findAll() {
    return this.prisma.db.orm.public.Visita.include('servicio').all();
  }

  /** Busca una visita junto al servicio al que pertenece. */
  findById(id_visita: number) {
    return this.prisma.db.orm.public.Visita.include('servicio')
      .where({ idVisita: id_visita })
      .first();
  }

  /** Busca la visita con el cliente y el reparador participantes. */
  findByIdWithParticipants(id_visita: number) {
    return this.prisma.db.orm.public.Visita.include('servicio', (servicio) =>
      servicio.include('propuesta', (propuesta) =>
        propuesta.include('trabajo'),
      ),
    )
      .where({ idVisita: id_visita })
      .first();
  }

  /** Agenda una visita después de bloquear al reparador y revisar sus horarios. */
  crearSiNoSeSolapa(
    id_servicio: number,
    id_reparador: number,
    datos_visita: CrearVisitaData,
  ) {
    return this.prisma.db.transaction((transaccion) =>
      this.crearVisitaEnTransaccion(
        id_servicio,
        id_reparador,
        datos_visita,
        transaccion,
      ),
    );
  }

  /** Cambia el estado solo si la visita todavía está programada. */
  async actualizarEstadoProgramada(
    id_visita: number,
    estado: 'realizada' | 'cancelada',
  ) {
    const visita_actualizada = await this.prisma.db.orm.public.Visita.where({
      idVisita: id_visita,
      estado: 'programada',
    }).update({ estado });

    if (!visita_actualizada) {
      return null;
    }

    return this.findByIdWithParticipants(id_visita);
  }

  /** Marca realizada una visita programada y recarga sus relaciones. */
  async marcarVisitaRealizada(id_visita: number) {
    const visita_actualizada =
      await this.prisma.db.orm.public.Visita.where({
        idVisita: id_visita,
        estado: 'programada',
      }).update({ estado: 'realizada' });

    if (!visita_actualizada) {
      return null;
    }

    return this.findByIdWithParticipants(id_visita);
  }

  /** Verifica solapamientos en la agenda del reparador y crea la visita. */
  private async crearVisitaEnTransaccion(
    id_servicio: number,
    id_reparador: number,
    datos_visita: CrearVisitaData,
    query_context: PrismaQueryContext,
  ) {
    const perfil_reparador =
      await query_context.orm.public.PerfilTrabajador.where({
        idUsuario: id_reparador,
      })
        .forUpdate()
        .first();

    if (!perfil_reparador) {
      return { resultado: 'perfil_no_encontrado' as const };
    }

    const servicio = await query_context.orm.public.Servicio.where({
      idServicio: id_servicio,
    })
      .forUpdate()
      .first();

    if (!servicio || !['programado', 'en_progreso'].includes(servicio.estado)) {
      return { resultado: 'servicio_no_activo' as const };
    }

    const propuesta_servicio = await query_context.orm.public.Propuesta.where({
      idPropuesta: servicio.idPropuesta,
    }).first();

    if (
      !propuesta_servicio ||
      propuesta_servicio.idReparador !== id_reparador
    ) {
      return { resultado: 'participante_no_coincide' as const };
    }

    const propuestas_reparador = await query_context.orm.public.Propuesta.where(
      {
        idReparador: id_reparador,
      },
    )
      .select('idPropuesta')
      .all();
    const ids_propuestas = propuestas_reparador.map(
      (propuesta) => propuesta.idPropuesta,
    );

    if (ids_propuestas.length === 0) {
      return { resultado: 'servicio_no_activo' as const };
    }

    const servicios_activos = await query_context.orm.public.Servicio.where(
      (servicio) => servicio.idPropuesta.in(ids_propuestas),
    )
      .where((servicio) => servicio.estado.in(['programado', 'en_progreso']))
      .select('idServicio')
      .all();
    const ids_servicios_activos = servicios_activos.map(
      (servicio) => servicio.idServicio,
    );

    if (ids_servicios_activos.length === 0) {
      return { resultado: 'servicio_no_activo' as const };
    }

    const visitas_programadas = await query_context.orm.public.Visita.where(
      (visita) => visita.idServicio.in(ids_servicios_activos),
    )
      .where({ estado: 'programada' })
      .all();
    const inicio_nuevo_ms = datos_visita.fechaInicio.getTime();
    const fin_nuevo_ms = datos_visita.fechaFin.getTime();
    const existe_solapamiento = visitas_programadas.some((visita) => {
      const inicio_existente_ms = visita.fechaInicio.getTime();
      const fin_existente_ms =
        visita.fechaFin?.getTime() ?? Number.POSITIVE_INFINITY;

      return (
        inicio_existente_ms < fin_nuevo_ms && fin_existente_ms > inicio_nuevo_ms
      );
    });

    if (existe_solapamiento) {
      return { resultado: 'solapamiento' as const };
    }

    const visita_creada = await query_context.orm.public.Visita.create({
      idServicio: id_servicio,
      fechaInicio: datos_visita.fechaInicio,
      fechaFin: datos_visita.fechaFin,
      estado: 'programada',
    });

    return {
      resultado: 'creada' as const,
      visita: visita_creada,
    };
  }
}
