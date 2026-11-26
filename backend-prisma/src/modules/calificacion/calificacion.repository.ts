import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearCalificacionData {
  idServicio: number;
  idEvaluador: number;
  idEvaluado: number;
  puntuacion: number;
  comentario: string;
}

/** Ejecuta consultas y escrituras de las calificaciones. */
@Injectable()
export class CalificacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista calificaciones con las personas evaluadas y evaluadoras. */
  findAll() {
    return this.prisma.db.orm.public.Calificacion.include('usuario')
      .include('usuarioUsuario')
      .include('servicio')
      .all();
  }

  /** Busca una calificación por su identificador principal. */
  findById(id_calificacion: number) {
    return this.prisma.db.orm.public.Calificacion.include('usuario')
      .include('usuarioUsuario')
      .include('servicio')
      .where({ idCalificacion: id_calificacion })
      .first();
  }

  /** Lista las calificaciones recibidas por un usuario reparador. */
  findByReparador(id_reparador: number) {
    return this.prisma.db.orm.public.Calificacion.where({
      idEvaluado: id_reparador,
    })
      .include('usuarioUsuario')
      .include('servicio')
      .all();
  }

  /** Busca una calificación previa del usuario para el mismo servicio. */
  findByServicioAndEvaluador(id_servicio: number, id_evaluador: number) {
    return this.prisma.db.orm.public.Calificacion.where({
      idServicio: id_servicio,
      idEvaluador: id_evaluador,
    })
      .select('idCalificacion')
      .first();
  }

  /** Guarda la calificación después de validar sus participantes en el servicio. */
  crearCalificacion(datos_calificacion: CrearCalificacionData) {
    return this.prisma.db.orm.public.Calificacion.create(datos_calificacion);
  }
}
