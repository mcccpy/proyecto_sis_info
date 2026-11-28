import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearPropuestaData {
  idTrabajo: number;
  idReparador: number;
  precioTotal: string;
  costoVisita: string;
  materialesIncluidos: boolean;
  detalleMateriales?: string;
}

export interface ActualizarCotizacionData {
  precioTotal: string;
  costoVisita: string;
  materialesIncluidos: boolean;
  detalleMateriales?: string;
}

/** Ejecuta las consultas y cambios de estado sobre propuestas. */
@Injectable()
export class PropuestaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista propuestas junto al trabajo y al perfil del reparador. */
  findAll() {
    return this.prisma.db.orm.public.Propuesta.include('trabajo')
      .include('perfilTrabajador')
      .all();
  }

  /** Obtiene una propuesta junto con el trabajo y datos públicos del cliente. */
  findById(
    id_propuesta: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Propuesta.include('trabajo', (trabajo) =>
      trabajo
        .include('usuario', (usuario_cliente) =>
          usuario_cliente.select('idUsuario', 'nombre'),
        )
        .include('categoriaTrabajos', (categorias_del_trabajo) =>
          categorias_del_trabajo.include('categoria'),
        ),
    )
      .include('perfilTrabajador')
      .include('servicio')
      .where({ idPropuesta: id_propuesta })
      .first();
  }

  /** Obtiene la información del trabajo necesaria antes de postular. */
  findTrabajoById(id_trabajo: number) {
    return this.prisma.db.orm.public.Trabajo.where({
      idTrabajo: id_trabajo,
      deletedAt: null,
    })
      .select(
        'idTrabajo',
        'idCliente',
        'estadoPublicacion',
        'tipoSolicitud',
        'deletedAt',
      )
      .first();
  }

  /** Comprueba si el reparador ya tiene una propuesta para el trabajo. */
  findByTrabajoAndReparador(id_trabajo: number, id_reparador: number) {
    return this.prisma.db.orm.public.Propuesta.where({
      idTrabajo: id_trabajo,
      idReparador: id_reparador,
    })
      .select('idPropuesta')
      .first();
  }

  /** Crea una postulación si el trabajo sigue abierto y no existe otra propuesta. */
  crearPostulacion(datos_propuesta: CrearPropuestaData) {
    return this.prisma.db.transaction(async (transaccion) => {
      const trabajo = await transaccion.orm.public.Trabajo.where({
        idTrabajo: datos_propuesta.idTrabajo,
        deletedAt: null,
      })
        .forUpdate()
        .first();

      if (
        !trabajo ||
        trabajo.estadoPublicacion !== 'abierto' ||
        trabajo.tipoSolicitud !== 'abierta'
      ) {
        return null;
      }

      const propuesta_existente = await transaccion.orm.public.Propuesta.where({
        idTrabajo: datos_propuesta.idTrabajo,
        idReparador: datos_propuesta.idReparador,
      }).first();

      if (propuesta_existente) {
        return null;
      }

      const propuesta_creada = await transaccion.orm.public.Propuesta.create({
        ...datos_propuesta,
        estado: 'pendiente',
      });

      return this.findById(propuesta_creada.idPropuesta, transaccion);
    });
  }

  /** Actualiza la cotización solo si la propuesta sigue pendiente. */
  async actualizarCotizacion(
    id_propuesta: number,
    id_reparador: number,
    datos_cotizacion: ActualizarCotizacionData,
  ) {
    const propuesta_actualizada =
      await this.prisma.db.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
        idReparador: id_reparador,
        estado: 'pendiente',
      }).update(datos_cotizacion);

    if (!propuesta_actualizada) {
      return null;
    }

    return this.findById(id_propuesta);
  }

  /** Rechaza una propuesta pendiente cuando lo solicita su cliente propietario. */
  async rechazarPropuesta(id_propuesta: number) {
    const propuesta_actualizada =
      await this.prisma.db.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
        estado: 'pendiente',
      }).update({ estado: 'rechazada' });

    if (!propuesta_actualizada) {
      return null;
    }

    return this.findById(id_propuesta);
  }

  /** Acepta una propuesta, rechaza sus competidoras y crea el servicio atómicamente. */
  aceptarPropuesta(id_propuesta: number, id_cliente: number) {
    return this.prisma.db.transaction(async (transaccion) => {
      const propuesta_inicial = await transaccion.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
      }).first();

      if (!propuesta_inicial) {
        return null;
      }

      const trabajo = await transaccion.orm.public.Trabajo.where({
        idTrabajo: propuesta_inicial.idTrabajo,
        deletedAt: null,
      })
        .forUpdate()
        .first();

      if (
        !trabajo ||
        trabajo.idCliente !== id_cliente ||
        trabajo.estadoPublicacion !== 'abierto'
      ) {
        return null;
      }

      const propuesta_aceptada = await transaccion.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
        idTrabajo: trabajo.idTrabajo,
        estado: 'pendiente',
      }).update({ estado: 'aceptada' });

      if (!propuesta_aceptada) {
        return null;
      }

      await transaccion.orm.public.Propuesta.where({
        idTrabajo: trabajo.idTrabajo,
        estado: 'pendiente',
      }).update({ estado: 'rechazada' });

      // El trigger puede cerrar el trabajo; se revisa su resultado antes de aplicar el fallback.
      const trabajo_despues_del_trigger =
        await transaccion.orm.public.Trabajo.where({
          idTrabajo: trabajo.idTrabajo,
        }).first();

      if (trabajo_despues_del_trigger?.estadoPublicacion === 'abierto') {
        const trabajo_cerrado = await transaccion.orm.public.Trabajo.where({
          idTrabajo: trabajo.idTrabajo,
          estadoPublicacion: 'abierto',
        }).update({ estadoPublicacion: 'cerrado' });

        if (!trabajo_cerrado) {
          throw new Error(
            `No se pudo cerrar el trabajo ${trabajo.idTrabajo} al aceptar la propuesta.`,
          );
        }
      } else if (trabajo_despues_del_trigger?.estadoPublicacion !== 'cerrado') {
        throw new Error(
          `El trabajo ${trabajo.idTrabajo} quedó en un estado inesperado al aceptar la propuesta.`,
        );
      }

      // Evita crear un servicio duplicado si el trigger ya lo generó al aceptar la propuesta.
      const servicio_creado_por_trigger =
        await transaccion.orm.public.Servicio.where({
          idPropuesta: id_propuesta,
        }).first();

      if (!servicio_creado_por_trigger) {
        await transaccion.orm.public.Servicio.create({
          idPropuesta: id_propuesta,
        });
      }

      return this.findById(id_propuesta, transaccion);
    });
  }

  /** Lista solicitudes directas pendientes dirigidas al reparador. */
  async findSolicitudesDirectasPendientes(id_reparador: number) {
    const ids_trabajos_directos =
      await this.findIdsTrabajosPorTipoSolicitud('directa');

    if (ids_trabajos_directos.length === 0) {
      return [];
    }

    // El enum vigente no contiene «solicitada»; estas propuestas usan «pendiente».
    return this.prisma.db.orm.public.Propuesta.where({
      idReparador: id_reparador,
      estado: 'pendiente',
    })
      .where((propuesta) => propuesta.idTrabajo.in(ids_trabajos_directos))
      .include('trabajo', (trabajo) =>
        trabajo
          .include('usuario', (usuario_cliente) =>
            usuario_cliente.select('idUsuario', 'nombre'),
          )
          .include('categoriaTrabajos', (categorias_del_trabajo) =>
            categorias_del_trabajo.include('categoria'),
          ),
      )
      .all();
  }

  /** Lista postulaciones pendientes que el reparador envió a trabajos abiertos. */
  async findPostulacionesEnviadasPendientes(id_reparador: number) {
    const ids_trabajos_abiertos =
      await this.findIdsTrabajosPorTipoSolicitud('abierta');

    if (ids_trabajos_abiertos.length === 0) {
      return [];
    }

    return this.prisma.db.orm.public.Propuesta.where({
      idReparador: id_reparador,
      estado: 'pendiente',
    })
      .where((propuesta) => propuesta.idTrabajo.in(ids_trabajos_abiertos))
      .include('trabajo', (trabajo) =>
        trabajo
          .include('usuario', (usuario_cliente) =>
            usuario_cliente.select('idUsuario', 'nombre'),
          )
          .include('categoriaTrabajos', (categorias_del_trabajo) =>
            categorias_del_trabajo.include('categoria'),
          ),
      )
      .all();
  }

  /** Obtiene solo trabajos vigentes del tipo indicado para filtrar propuestas. */
  private findIdsTrabajosPorTipoSolicitud(
    tipo_solicitud: 'abierta' | 'directa',
  ) {
    return this.prisma.db.orm.public.Trabajo.where({
      tipoSolicitud: tipo_solicitud,
      deletedAt: null,
    })
      .select('idTrabajo')
      .all()
      .then((trabajos) => trabajos.map((trabajo) => trabajo.idTrabajo));
  }

  /** Recupera los identificadores de trabajos donde ya existe una propuesta. */
  findIdsTrabajosConPropuesta(id_reparador: number) {
    return this.prisma.db.orm.public.Propuesta.where({
      idReparador: id_reparador,
    })
      .select('idTrabajo')
      .all();
  }

  /** Cambia el estado y vuelve a leer la propuesta con los datos del trabajo. */
  async actualizarEstadoPropuesta(
    id_propuesta: number,
    nuevo_estado: 'retirada',
  ) {
    const propuesta_actualizada =
      await this.prisma.db.orm.public.Propuesta.where({
        idPropuesta: id_propuesta,
        estado: 'pendiente',
      }).update({ estado: nuevo_estado });

    if (!propuesta_actualizada) {
      return null;
    }

    return this.findById(id_propuesta);
  }
}
