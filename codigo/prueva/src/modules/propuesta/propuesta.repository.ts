import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Ejecuta las consultas y cambios de estado sobre propuestas. */
@Injectable()
export class PropuestaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Obtiene una propuesta junto con el trabajo y datos públicos del cliente. */
  findById(id_propuesta: number) {
    return this.prisma.db.orm.public.Propuesta.include('trabajo', (trabajo) =>
      trabajo
        .include('usuario', (usuario_cliente) =>
          usuario_cliente.select('idUsuario', 'nombre'),
        )
        .include('categoriaTrabajos', (categorias_del_trabajo) =>
          categorias_del_trabajo.include('categoria'),
        ),
    )
      .where({ idPropuesta: id_propuesta })
      .first();
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
