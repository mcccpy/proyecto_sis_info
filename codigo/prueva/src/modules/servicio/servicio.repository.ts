import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Consulta los servicios activos asignados a un reparador. */
@Injectable()
export class ServicioRepository {
  constructor(private readonly prisma: PrismaService) {}

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
