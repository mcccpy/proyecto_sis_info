import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilTrabajadorRepository } from '../perfil-trabajador/perfil-trabajador.repository';
import { CotizarPropuestaDto } from './dto/cotizar-propuesta.dto';
import { PostularPropuestaDto } from './dto/postular-propuesta.dto';
import { ResolverPropuestaDto } from './dto/resolver-propuesta.dto';
import { PropuestaRepository } from './propuesta.repository';

type PropuestaConTrabajo = NonNullable<
  Awaited<ReturnType<PropuestaRepository['findById']>>
> & {
  trabajo: NonNullable<
    NonNullable<Awaited<ReturnType<PropuestaRepository['findById']>>>['trabajo']
  >;
};

/**
 * Coordina postulaciones, cotizaciones y decisiones de los clientes.
 */
@Injectable()
export class PropuestaService {
  constructor(
    private readonly propuestaRepository: PropuestaRepository,
    private readonly perfilTrabajadorRepository: PerfilTrabajadorRepository,
  ) {}

  /** Crea una postulación inicial únicamente para reparadores aprobados. */
  async postular(datos_propuesta: PostularPropuestaDto) {
    const perfil_reparador =
      await this.perfilTrabajadorRepository.findByUsuarioId(
        datos_propuesta.id_reparador,
      );

    if (!perfil_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    if (perfil_reparador.estadoAprobacion !== 'aprobado') {
      throw new ForbiddenException(
        'Solo los reparadores aprobados pueden postularse',
      );
    }

    const trabajo = await this.propuestaRepository.findTrabajoById(
      datos_propuesta.id_trabajo,
    );

    if (!trabajo) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    if (trabajo.idCliente === datos_propuesta.id_reparador) {
      throw new BadRequestException('No puedes postularte a tu propio trabajo');
    }

    if (
      trabajo.estadoPublicacion !== 'abierto' ||
      trabajo.tipoSolicitud !== 'abierta'
    ) {
      throw new BadRequestException(
        'Solo puedes postularte a trabajos abiertos',
      );
    }

    if (
      await this.propuestaRepository.findByTrabajoAndReparador(
        datos_propuesta.id_trabajo,
        datos_propuesta.id_reparador,
      )
    ) {
      throw new ConflictException(
        'Ya existe una propuesta de este reparador para el trabajo',
      );
    }

    const propuesta_creada = await this.propuestaRepository.crearPostulacion({
      idTrabajo: datos_propuesta.id_trabajo,
      idReparador: datos_propuesta.id_reparador,
      precioTotal: datos_propuesta.precio_total.toFixed(2),
      costoVisita: (datos_propuesta.costo_visita ?? 0).toFixed(2),
      materialesIncluidos: datos_propuesta.materiales_incluidos,
      ...(datos_propuesta.detalle_materiales !== undefined && {
        detalleMateriales: datos_propuesta.detalle_materiales,
      }),
    });

    if (!propuesta_creada) {
      const propuesta_existente =
        await this.propuestaRepository.findByTrabajoAndReparador(
          datos_propuesta.id_trabajo,
          datos_propuesta.id_reparador,
        );

      if (propuesta_existente) {
        throw new ConflictException(
          'Ya existe una propuesta de este reparador para el trabajo',
        );
      }

      throw new BadRequestException(
        'El trabajo dejó de estar abierto y ya no acepta postulaciones',
      );
    }

    return propuesta_creada;
  }

  /** Actualiza la cotización de una propuesta pendiente de su reparador. */
  async cotizar(id_propuesta: number, datos_cotizacion: CotizarPropuestaDto) {
    const perfil_reparador =
      await this.perfilTrabajadorRepository.findByUsuarioId(
        datos_cotizacion.id_reparador,
      );

    if (!perfil_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    if (perfil_reparador.estadoAprobacion !== 'aprobado') {
      throw new ForbiddenException(
        'Solo los reparadores aprobados pueden enviar cotizaciones',
      );
    }

    const propuesta = await this.propuestaRepository.findById(id_propuesta);

    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (!propuesta.trabajo) {
      throw new NotFoundException(
        'Trabajo asociado a la propuesta no encontrado',
      );
    }

    if (propuesta.idReparador !== datos_cotizacion.id_reparador) {
      throw new ForbiddenException(
        'Solo el reparador propietario puede cotizar esta propuesta',
      );
    }

    if (
      propuesta.estado !== 'pendiente' ||
      propuesta.trabajo.estadoPublicacion !== 'abierto'
    ) {
      throw new BadRequestException(
        'Solo se pueden cotizar propuestas pendientes de trabajos abiertos',
      );
    }

    const propuesta_actualizada =
      await this.propuestaRepository.actualizarCotizacion(
        id_propuesta,
        datos_cotizacion.id_reparador,
        {
          precioTotal: datos_cotizacion.precio_total.toFixed(2),
          costoVisita: (datos_cotizacion.costo_visita ?? 0).toFixed(2),
          materialesIncluidos: datos_cotizacion.materiales_incluidos,
          ...(datos_cotizacion.detalle_materiales !== undefined && {
            detalleMateriales: datos_cotizacion.detalle_materiales,
          }),
        },
      );

    if (!propuesta_actualizada) {
      throw new BadRequestException(
        'La propuesta ya no está disponible para actualizarse',
      );
    }

    return propuesta_actualizada;
  }

  /** Acepta una propuesta por su cliente y crea el servicio asociado. */
  async aceptarPropuesta(
    id_propuesta: number,
    datos_decision: ResolverPropuestaDto,
  ) {
    const propuesta = await this.propuestaRepository.findById(id_propuesta);
    this.validarDecisionCliente(propuesta, datos_decision.id_cliente);

    if (propuesta.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden aceptar propuestas pendientes',
      );
    }

    if (propuesta.trabajo.estadoPublicacion !== 'abierto') {
      throw new BadRequestException(
        'El trabajo ya no está abierto para aceptar propuestas',
      );
    }

    if (Number(propuesta.precioTotal) <= 0) {
      throw new BadRequestException(
        'La propuesta debe tener una cotización antes de ser aceptada',
      );
    }

    const propuesta_aceptada = await this.propuestaRepository.aceptarPropuesta(
      id_propuesta,
      datos_decision.id_cliente,
    );

    if (!propuesta_aceptada) {
      const propuesta_actual =
        await this.propuestaRepository.findById(id_propuesta);

      this.validarDecisionCliente(propuesta_actual, datos_decision.id_cliente);

      throw new BadRequestException(
        'La propuesta o el trabajo ya no están disponibles para aceptarse',
      );
    }

    return propuesta_aceptada;
  }

  /** Rechaza una propuesta pendiente por decisión de su cliente propietario. */
  async rechazarPropuesta(
    id_propuesta: number,
    datos_decision: ResolverPropuestaDto,
  ) {
    const propuesta = await this.propuestaRepository.findById(id_propuesta);
    this.validarDecisionCliente(propuesta, datos_decision.id_cliente);

    if (
      propuesta.estado !== 'pendiente' ||
      propuesta.trabajo.estadoPublicacion !== 'abierto'
    ) {
      throw new BadRequestException(
        'Solo se pueden rechazar propuestas pendientes de trabajos abiertos',
      );
    }

    const propuesta_rechazada =
      await this.propuestaRepository.rechazarPropuesta(id_propuesta);

    if (!propuesta_rechazada) {
      throw new BadRequestException(
        'La propuesta ya no está disponible para rechazarse',
      );
    }

    return propuesta_rechazada;
  }

  /** Retira solo postulaciones pendientes del reparador y de trabajos abiertos. */
  async retirarPostulacion(id_reparador: number, id_propuesta: number) {
    const propuesta = await this.propuestaRepository.findById(id_propuesta);

    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (propuesta.idReparador !== id_reparador) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta propuesta',
      );
    }

    if (
      propuesta.estado !== 'pendiente' ||
      !propuesta.trabajo ||
      propuesta.trabajo.tipoSolicitud !== 'abierta'
    ) {
      throw new BadRequestException(
        'Solo puedes retirar postulaciones que aún estén pendientes',
      );
    }

    const propuesta_retirada =
      await this.propuestaRepository.actualizarEstadoPropuesta(
        id_propuesta,
        'retirada',
      );

    if (!propuesta_retirada) {
      const propuesta_actual =
        await this.propuestaRepository.findById(id_propuesta);

      if (!propuesta_actual) {
        throw new NotFoundException('Propuesta no encontrada');
      }

      throw new BadRequestException(
        'Solo puedes retirar postulaciones que aún estén pendientes',
      );
    }

    return propuesta_retirada;
  }

  /** Lista propuestas con los datos básicos del trabajo y del reparador. */
  listarTodos() {
    return this.propuestaRepository.findAll();
  }

  /** Busca una propuesta y notifica cuando no existe. */
  async obtenerPorId(id_propuesta: number) {
    const propuesta = await this.propuestaRepository.findById(id_propuesta);

    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    return propuesta;
  }

  /** Verifica que la decisión corresponda al cliente dueño del trabajo. */
  private validarDecisionCliente(
    propuesta: Awaited<ReturnType<PropuestaRepository['findById']>>,
    id_cliente: number,
  ): asserts propuesta is PropuestaConTrabajo {
    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (!propuesta.trabajo) {
      throw new NotFoundException(
        'Trabajo asociado a la propuesta no encontrado',
      );
    }

    if (propuesta.trabajo.idCliente !== id_cliente) {
      throw new ForbiddenException(
        'Solo el cliente dueño del trabajo puede decidir sobre la propuesta',
      );
    }
  }
}
