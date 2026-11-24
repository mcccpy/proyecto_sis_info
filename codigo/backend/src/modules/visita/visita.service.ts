import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicioRepository } from '../servicio/servicio.repository';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { CambiarEstadoVisitaDto } from './dto/cambiar-estado-visita.dto';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { MarcarVisitaRealizadaDto } from './dto/marcar-visita-realizada.dto';
import { VisitaRepository } from './visita.repository';

/** Coordina el agendamiento y los cambios de estado de las visitas. */
@Injectable()
export class VisitaService {
  constructor(
    private readonly visitaRepository: VisitaRepository,
    private readonly servicioRepository: ServicioRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Lista visitas reales junto a sus servicios. */
  listarTodos() {
    return this.visitaRepository.findAll();
  }

  /** Busca una visita y notifica cuando el identificador no existe. */
  async obtenerPorId(id_visita: number, id_usuario: number) {
    const visita =
      await this.visitaRepository.findByIdWithParticipants(id_visita);

    if (!visita) {
      throw new NotFoundException('Visita no encontrada');
    }

    const propuesta = visita.servicio?.propuesta;
    const es_cliente =
      propuesta?.trabajo?.idCliente === id_usuario;
    const es_reparador = propuesta?.idReparador === id_usuario;
    const es_administrador =
      await this.usuarioRepository.esAdministrador(id_usuario);
    if (!es_cliente && !es_reparador && !es_administrador) {
      throw new ForbiddenException(
        'Solo los participantes o un administrador pueden consultar esta visita',
      );
    }

    return visita;
  }

  /** Agenda una visita para uno de los participantes de un servicio activo. */
  async crearVisita(id_servicio: number, datos_visita: CreateVisitaDto) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        id_servicio,
      );

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    if (
      datos_visita.id_usuario !== servicio.propuesta.idReparador &&
      datos_visita.id_usuario !== servicio.propuesta.trabajo.idCliente
    ) {
      throw new ForbiddenException(
        'Solo el cliente o el reparador asignado pueden agendar una visita',
      );
    }

    if (!['programado', 'en_progreso'].includes(servicio.estado)) {
      throw new BadRequestException(
        'Solo se pueden agendar visitas para servicios activos',
      );
    }

    const fecha_inicio = new Date(datos_visita.fecha_inicio);
    const fecha_fin = new Date(datos_visita.fecha_fin);

    if (
      !Number.isFinite(fecha_inicio.getTime()) ||
      !Number.isFinite(fecha_fin.getTime()) ||
      fecha_fin <= fecha_inicio
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    const resultado_creacion = await this.visitaRepository.crearSiNoSeSolapa(
      id_servicio,
      servicio.propuesta.idReparador,
      { fechaInicio: fecha_inicio, fechaFin: fecha_fin },
    );

    if (resultado_creacion.resultado === 'perfil_no_encontrado') {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    if (resultado_creacion.resultado === 'servicio_no_activo') {
      throw new BadRequestException(
        'El servicio dejó de estar activo y ya no admite visitas',
      );
    }

    if (resultado_creacion.resultado === 'participante_no_coincide') {
      throw new ForbiddenException(
        'El servicio ya no pertenece al reparador indicado',
      );
    }

    if (resultado_creacion.resultado === 'solapamiento') {
      throw new ConflictException(
        'El reparador ya tiene una visita programada en ese intervalo',
      );
    }

    return resultado_creacion.visita;
  }

  /** Permite al cliente cancelar una visita antes de iniciar el servicio. */
  async cambiarEstado(id_visita: number, datos_cambio: CambiarEstadoVisitaDto) {
    const visita =
      await this.visitaRepository.findByIdWithParticipants(id_visita);

    if (!visita) {
      throw new NotFoundException('Visita no encontrada');
    }

    if (!visita.servicio) {
      throw new NotFoundException(
        'Servicio asociado a la visita no encontrado',
      );
    }

    const propuesta = visita.servicio.propuesta;
    if (!propuesta || !propuesta.trabajo) {
      throw new NotFoundException(
        'Participantes asociados a la visita no encontrados',
      );
    }

    const es_participante =
      datos_cambio.id_usuario === propuesta.idReparador ||
      datos_cambio.id_usuario === propuesta.trabajo.idCliente;

    if (!es_participante) {
      throw new ForbiddenException(
        'Solo el cliente o el reparador asignado pueden cambiar el estado de la visita',
      );
    }

    if (datos_cambio.id_usuario !== propuesta.trabajo.idCliente) {
      throw new ForbiddenException(
        'Solo el cliente puede cancelar una visita programada',
      );
    }

    if (visita.estado !== 'programada') {
      throw new BadRequestException(
        'Solo se puede cambiar el estado de visitas programadas',
      );
    }

    if (
      visita.servicio.estado === 'en_progreso' ||
      visita.servicio.estado === 'completado' ||
      visita.servicio.estado === 'cancelado'
    ) {
      throw new BadRequestException(
        'No se puede cancelar la visita después de iniciar o cancelar el servicio',
      );
    }

    const visita_actualizada =
      await this.visitaRepository.actualizarEstadoProgramada(
        id_visita,
        datos_cambio.estado,
      );

    if (!visita_actualizada) {
      throw new BadRequestException(
        'La visita ya no está disponible para cambiar de estado',
      );
    }

    return visita_actualizada;
  }

  /** Marca realizada una visita únicamente para el reparador asignado. */
  async marcarVisitaRealizada(
    id_visita: number,
    datos_realizacion: MarcarVisitaRealizadaDto,
  ) {
    const visita =
      await this.visitaRepository.findByIdWithParticipants(id_visita);

    if (!visita) {
      throw new NotFoundException('Visita no encontrada');
    }

    if (!visita.servicio?.propuesta) {
      throw new NotFoundException(
        'No se encontró el servicio asociado a la visita',
      );
    }

    if (
      visita.servicio.propuesta.idReparador !==
      datos_realizacion.id_reparador
    ) {
      throw new ForbiddenException(
        'Solo el reparador asignado puede marcar la visita como realizada',
      );
    }

    if (visita.estado !== 'programada') {
      throw new BadRequestException(
        'Solo se pueden realizar visitas que estén programadas',
      );
    }

    if (
      visita.servicio.estado === 'completado' ||
      visita.servicio.estado === 'cancelado'
    ) {
      throw new BadRequestException(
        'No se puede realizar una visita de un servicio completado o cancelado',
      );
    }

    const visita_actualizada =
      await this.visitaRepository.marcarVisitaRealizada(id_visita);

    if (!visita_actualizada) {
      throw new BadRequestException(
        'La visita ya no está disponible para marcarse como realizada',
      );
    }

    return visita_actualizada;
  }
}
