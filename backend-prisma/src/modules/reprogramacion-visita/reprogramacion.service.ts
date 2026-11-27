import { BadRequestException, Injectable } from '@nestjs/common';
import { ProgramarVisitaDto } from './dto/programar-visita.dto';
import { SolicitarReprogramacionDto } from './dto/solicitar-reprogramacion.dto';
import { ResponderReprogramacionDto } from './dto/responder-reprogramacion.dto';
import { ReprogramacionRepository } from './reprogramacion.repository';

// El SERVICE contiene validaciones faciles de entender y coordina el repository.
@Injectable()
export class ReprogramacionService {
  constructor(private readonly repositorio: ReprogramacionRepository) {}

  listarServicios(idUsuario: number) {
    return this.repositorio.listarServicios(idUsuario);
  }

  listarVisitas(idUsuario: number) {
    return this.repositorio.listarVisitas(idUsuario);
  }

  historial(idVisita: number, idUsuario: number) {
    return this.repositorio.historial(idVisita, idUsuario);
  }

  programar(idUsuario: number, datos: ProgramarVisitaDto) {
    const fechas = this.validarFechas(datos.fecha_inicio, datos.fecha_fin);
    return this.repositorio.programarVisita(datos.id_servicio, idUsuario,
      fechas.inicio, fechas.fin);
  }

  solicitar(idVisita: number, idUsuario: number, datos: SolicitarReprogramacionDto) {
    const fechas = this.validarFechas(datos.fecha_inicio, datos.fecha_fin);
    const motivo = datos.motivo.trim();
    if (motivo.length < 5) {
      throw new BadRequestException('Explica el motivo en al menos 5 caracteres');
    }
    return this.repositorio.solicitarCambio(idVisita, idUsuario,
      fechas.inicio, fechas.fin, motivo);
  }

  responder(idSolicitud: number, idUsuario: number, datos: ResponderReprogramacionDto) {
    return this.repositorio.responderCambio(idSolicitud, idUsuario, datos.decision);
  }

  // No se permiten horas invalidas, pasadas ni rangos invertidos.
  private validarFechas(fechaInicio: string, fechaFin: string) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime())) {
      throw new BadRequestException('La fecha y la hora no son validas');
    }
    if (inicio.getTime() <= Date.now()) {
      throw new BadRequestException('El horario debe estar en el futuro');
    }
    if (fin.getTime() <= inicio.getTime()) {
      throw new BadRequestException('La fecha final debe ser posterior a la inicial');
    }
    return { inicio, fin };
  }
}
