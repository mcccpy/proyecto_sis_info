import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

// Usamos las mismas credenciales DATABASE_URL que utiliza el backend Prisma.
// SQL parametrizado ($1, $2...) evita inyecciones de SQL.

interface DatosVisita {
  id_visita: number;
  id_servicio: number;
  id_cliente: number;
  id_reparador: number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  estado: string;
  estado_servicio: string;
}

interface DatosServicio {
  id_servicio: number;
  id_cliente: number;
  id_reparador: number;
  estado: string;
}

interface DatosSolicitud {
  id_reprogramacion: number;
  id_visita: number;
  id_solicitante: number;
  estado: string;
  fecha_anterior_inicio: Date;
  fecha_anterior_fin: Date;
  fecha_nueva_inicio: Date;
  fecha_nueva_fin: Date;
}

const CONSULTA_VISITA = `
  SELECT v.id_visita, v.id_servicio, v.fecha_inicio, v.fecha_fin, v.estado,
         s.estado AS estado_servicio, t.id_cliente, p.id_reparador
  FROM visita v
  JOIN servicio s ON s.id_servicio = v.id_servicio
  JOIN propuesta p ON p.id_propuesta = s.id_propuesta
  JOIN trabajo t ON t.id_trabajo = p.id_trabajo
  WHERE v.id_visita = $1
`;

@Injectable()
export class ReprogramacionRepository implements OnModuleDestroy {
  // Un pool reutiliza conexiones. No contiene datos falsos ni simulados.
  private readonly conexion = new Pool({
    connectionString: process.env['DATABASE_URL'],
  });

  async onModuleDestroy() {
    await this.conexion.end();
  }

  // SERVICIOS: para crear una visita inicial cuando todavia no existe.
  async listarServicios(idUsuario: number) {
    const resultado = await this.conexion.query(`
      SELECT s.id_servicio, s.estado, t.titulo,
             t.id_cliente, p.id_reparador
      FROM servicio s
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
      JOIN trabajo t ON t.id_trabajo = p.id_trabajo
      WHERE (t.id_cliente = $1 OR p.id_reparador = $1)
        AND s.estado IN ('programado', 'en_progreso')
      ORDER BY s.id_servicio DESC
    `, [idUsuario]);
    return resultado.rows;
  }

  // VISITAS: solo se muestran las que pertenecen al cliente o al trabajador.
  async listarVisitas(idUsuario: number) {
    const resultado = await this.conexion.query(`
      SELECT v.id_visita, v.id_servicio, v.fecha_inicio, v.fecha_fin, v.estado,
             s.estado AS estado_servicio, t.titulo, t.id_cliente, p.id_reparador,
             cliente.nombre AS nombre_cliente, reparador.nombre AS nombre_reparador
      FROM visita v
      JOIN servicio s ON s.id_servicio = v.id_servicio
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
      JOIN trabajo t ON t.id_trabajo = p.id_trabajo
      JOIN usuario cliente ON cliente.id_usuario = t.id_cliente
      JOIN usuario reparador ON reparador.id_usuario = p.id_reparador
      WHERE t.id_cliente = $1 OR p.id_reparador = $1
      ORDER BY v.fecha_inicio DESC
    `, [idUsuario]);
    return resultado.rows;
  }

  // HISTORIAL: se conserva una fila por cada solicitud, incluso las rechazadas.
  async historial(idVisita: number, idUsuario: number) {
    const resultado = await this.conexion.query(CONSULTA_VISITA, [idVisita]);
    const visita = resultado.rows[0] as DatosVisita | undefined;
    this.verificarParticipante(visita, idUsuario);

    const historial = await this.conexion.query(`
      SELECT r.*, solicitante.nombre AS nombre_solicitante,
             revisor.nombre AS nombre_revisor
      FROM reprogramacion_visita r
      JOIN usuario solicitante ON solicitante.id_usuario = r.id_solicitante
      LEFT JOIN usuario revisor ON revisor.id_usuario = r.id_revisor
      WHERE r.id_visita = $1
      ORDER BY r.fecha_solicitud DESC, r.id_reprogramacion DESC
    `, [idVisita]);
    return historial.rows;
  }

  // Programa una primera visita. Se usa para poder demostrar el recorrido completo.
  programarVisita(idServicio: number, idUsuario: number, inicio: Date, fin: Date) {
    return this.enTransaccion(async (cliente) => {
      const consulta = await cliente.query(`
        SELECT s.id_servicio, s.estado, t.id_cliente, p.id_reparador
        FROM servicio s
        JOIN propuesta p ON p.id_propuesta = s.id_propuesta
        JOIN trabajo t ON t.id_trabajo = p.id_trabajo
        WHERE s.id_servicio = $1
      `, [idServicio]);
      const servicio = consulta.rows[0] as DatosServicio | undefined;
      if (!servicio) throw new NotFoundException('Servicio no encontrado');
      this.verificarParticipante(servicio, idUsuario);

      // Bloquear la fila del trabajador hace que dos reservas simultaneas
      // no puedan aprobar horarios que se pisan.
      await this.bloquearTrabajador(cliente, servicio.id_reparador);
      const confirmado = await cliente.query(
        'SELECT estado FROM servicio WHERE id_servicio = $1 FOR UPDATE',
        [idServicio],
      );
      if (!['programado', 'en_progreso'].includes(String(confirmado.rows[0]?.estado))) {
        throw new BadRequestException('El servicio ya no esta activo');
      }
      await this.verificarChoque(cliente, servicio.id_reparador, 0, inicio, fin);

      const resultado = await cliente.query(`
        INSERT INTO visita (id_servicio, fecha_inicio, fecha_fin, estado)
        VALUES ($1, $2, $3, 'programada')
        RETURNING *
      `, [idServicio, inicio, fin]);
      return resultado.rows[0];
    });
  }

  // SOLICITAR: guarda la propuesta sin alterar todavia la visita original.
  solicitarCambio(idVisita: number, idUsuario: number,
                 inicio: Date, fin: Date, motivo: string) {
    return this.enTransaccion(async (cliente) => {
      const original = await cliente.query(CONSULTA_VISITA, [idVisita]);
      const primera = original.rows[0] as DatosVisita | undefined;
      this.verificarParticipante(primera, idUsuario);

      await this.bloquearTrabajador(cliente, primera!.id_reparador);
      const consulta = await cliente.query(CONSULTA_VISITA + ' FOR UPDATE OF v', [idVisita]);
      const visita = consulta.rows[0] as DatosVisita | undefined;
      this.verificarParticipante(visita, idUsuario);
      this.validarVisitaActiva(visita!);

      if (!visita!.fecha_fin) {
        throw new BadRequestException('La visita original debe tener hora de finalizacion');
      }
      if (visita!.fecha_inicio.getTime() === inicio.getTime() &&
          visita!.fecha_fin.getTime() === fin.getTime()) {
        throw new BadRequestException('Debes proponer un horario diferente al actual');
      }

      // La validacion se repetira al aprobar, porque otra visita puede crearse entretanto.
      await this.verificarChoque(cliente, visita!.id_reparador, idVisita, inicio, fin);

      try {
        const resultado = await cliente.query(`
          INSERT INTO reprogramacion_visita
          (id_visita, id_solicitante, fecha_anterior_inicio, fecha_anterior_fin,
           fecha_nueva_inicio, fecha_nueva_fin, motivo)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [idVisita, idUsuario, visita!.fecha_inicio, visita!.fecha_fin, inicio, fin, motivo]);
        return resultado.rows[0];
      } catch (error) {
        // El indice UNIQUE impide una segunda solicitud pendiente sobre la misma visita.
        if ((error as { code?: string }).code === '23505') {
          throw new ConflictException('Esta visita ya tiene una solicitud pendiente');
        }
        throw error;
      }
    });
  }

  // RESPONDER: solo responde el OTRO participante, nunca quien solicito.
  responderCambio(idSolicitud: number, idUsuario: number, decision: 'aprobar' | 'rechazar') {
    return this.enTransaccion(async (cliente) => {
      const encontrada = await cliente.query(`
        SELECT id_visita FROM reprogramacion_visita WHERE id_reprogramacion = $1
      `, [idSolicitud]);
      const idVisita = Number(encontrada.rows[0]?.id_visita);
      if (!idVisita) throw new NotFoundException('Solicitud no encontrada');

      const consultaInicial = await cliente.query(CONSULTA_VISITA, [idVisita]);
      const inicial = consultaInicial.rows[0] as DatosVisita | undefined;
      this.verificarParticipante(inicial, idUsuario);

      // Este mismo bloqueo se usa al crear visitas: evita dobles reservas.
      await this.bloquearTrabajador(cliente, inicial!.id_reparador);
      const visitaResult = await cliente.query(CONSULTA_VISITA + ' FOR UPDATE OF v', [idVisita]);
      const visita = visitaResult.rows[0] as DatosVisita | undefined;
      this.verificarParticipante(visita, idUsuario);

      const solicitudResult = await cliente.query(`
        SELECT * FROM reprogramacion_visita
        WHERE id_reprogramacion = $1 FOR UPDATE
      `, [idSolicitud]);
      const solicitud = solicitudResult.rows[0] as DatosSolicitud | undefined;
      if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
      if (solicitud.estado !== 'pendiente') {
        throw new ConflictException('Esta solicitud ya fue respondida');
      }
      if (solicitud.id_solicitante === idUsuario) {
        throw new ForbiddenException('No puedes aprobar o rechazar tu propia solicitud');
      }

      if (decision === 'aprobar') {
        this.validarVisitaActiva(visita!);
        if (!visita!.fecha_fin ||
            visita!.fecha_inicio.getTime() !== solicitud.fecha_anterior_inicio.getTime() ||
            visita!.fecha_fin.getTime() !== solicitud.fecha_anterior_fin.getTime()) {
          throw new ConflictException('La fecha original de la visita ya cambio');
        }
        if (solicitud.fecha_nueva_inicio.getTime() <= Date.now()) {
          throw new BadRequestException('El nuevo horario ya quedo en el pasado');
        }
        await this.verificarChoque(cliente, visita!.id_reparador, idVisita,
          solicitud.fecha_nueva_inicio, solicitud.fecha_nueva_fin);
        await cliente.query(`
          UPDATE visita SET fecha_inicio = $1, fecha_fin = $2 WHERE id_visita = $3
        `, [solicitud.fecha_nueva_inicio, solicitud.fecha_nueva_fin, idVisita]);
      }

      const nuevoEstado = decision === 'aprobar' ? 'aprobada' : 'rechazada';
      const guardada = await cliente.query(`
        UPDATE reprogramacion_visita
        SET estado = $1, id_revisor = $2, fecha_respuesta = now()
        WHERE id_reprogramacion = $3 AND estado = 'pendiente'
        RETURNING *
      `, [nuevoEstado, idUsuario, idSolicitud]);
      return guardada.rows[0];
    });
  }

  private verificarParticipante(
    registro: { id_cliente: number; id_reparador: number } | undefined,
    idUsuario: number,
  ): void {
    if (!registro) throw new NotFoundException('Visita o servicio no encontrado');
    if (registro.id_cliente !== idUsuario && registro.id_reparador !== idUsuario) {
      throw new ForbiddenException('Solo el cliente y el trabajador asignado pueden acceder');
    }
  }

  private validarVisitaActiva(visita: DatosVisita): void {
    if (visita.estado !== 'programada' ||
        !['programado', 'en_progreso'].includes(visita.estado_servicio)) {
      throw new BadRequestException('Solo se pueden reprogramar visitas de servicios activos');
    }
  }

  private async bloquearTrabajador(cliente: PoolClient, idReparador: number) {
    const resultado = await cliente.query(`
      SELECT id_usuario FROM perfil_trabajador
      WHERE id_usuario = $1 FOR UPDATE
    `, [idReparador]);
    if (!resultado.rows.length) {
      throw new NotFoundException('El trabajador no tiene perfil registrado');
    }
  }

  // A y B se superponen si A.inicio < B.fin Y A.fin > B.inicio.
  // Excluimos la misma visita: cambiar su horario no debe contarse como choque.
  private async verificarChoque(cliente: PoolClient, idReparador: number,
                                idVisita: number, inicio: Date, fin: Date) {
    const resultado = await cliente.query(`
      SELECT v.id_visita FROM visita v
      JOIN servicio s ON s.id_servicio = v.id_servicio
      JOIN propuesta p ON p.id_propuesta = s.id_propuesta
      WHERE p.id_reparador = $1
        AND v.id_visita <> $2
        AND v.estado = 'programada'
        AND s.estado IN ('programado', 'en_progreso')
        AND v.fecha_inicio < $4
        AND (v.fecha_fin IS NULL OR v.fecha_fin > $3)
      LIMIT 1
    `, [idReparador, idVisita, inicio, fin]);
    if (resultado.rows.length > 0) {
      throw new ConflictException('El trabajador ya tiene otra visita en ese horario');
    }
  }

  // BEGIN/COMMIT: la fecha y el historial se guardan juntos.
  // Si algo falla, ROLLBACK evita dejar los datos a medias.
  private async enTransaccion<T>(accion: (cliente: PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.conexion.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await accion(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
