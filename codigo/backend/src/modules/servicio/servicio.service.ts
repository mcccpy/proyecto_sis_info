import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { DictamenIncrementoDto } from './dto/dictamen-incremento.dto';
import { SolicitarAjustePresupuestoDto } from './dto/solicitar-ajuste-presupuesto.dto';
import { CancelarServicioDto } from './dto/cancelar-servicio.dto';
import { CrearNotaTecnicaDto } from './dto/crear-nota-tecnica.dto';
import { ServicioRepository } from './servicio.repository';

/** Coordina las reglas de negocio para servicios, presupuestos y pagos. */
@Injectable()
export class ServicioService {
  constructor(
    private readonly servicioRepository: ServicioRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Registra un aumento pendiente o aplica de inmediato una disminución del precio. */
  async registrarAjustePresupuesto(
    id_servicio: number,
    datos_ajuste: SolicitarAjustePresupuestoDto,
  ) {
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

    if (!['programado', 'en_progreso'].includes(servicio.estado)) {
      throw new BadRequestException(
        'Solo se puede modificar el presupuesto de un servicio activo',
      );
    }

    if (datos_ajuste.monto_nuevo === datos_ajuste.monto_anterior) {
      throw new BadRequestException(
        'El monto nuevo debe ser distinto al monto anterior',
      );
    }

    const propuesta = servicio.propuesta;
    const es_cliente_del_trabajo =
      datos_ajuste.id_solicitante === propuesta.trabajo.idCliente;
    const es_reparador_asignado =
      datos_ajuste.id_solicitante === propuesta.idReparador;

    if (!es_cliente_del_trabajo && !es_reparador_asignado) {
      throw new ForbiddenException(
        'Solo el cliente o el reparador asignado pueden solicitar un ajuste',
      );
    }

    const datos_incremento = {
      idServicio: id_servicio,
      idSolicitante: datos_ajuste.id_solicitante,
      montoAnterior: datos_ajuste.monto_anterior.toFixed(2),
      montoNuevo: datos_ajuste.monto_nuevo.toFixed(2),
      motivo: datos_ajuste.motivo,
    };

    if (datos_ajuste.monto_nuevo > datos_ajuste.monto_anterior) {
      return this.servicioRepository.crearIncrementoPendiente(datos_incremento);
    }

    if (!es_reparador_asignado) {
      throw new ForbiddenException(
        'Solo el reparador puede registrar una disminución de presupuesto',
      );
    }

    const disminucion_registrada =
      await this.servicioRepository.registrarDisminucionPresupuesto(
        datos_incremento,
        propuesta.idPropuesta,
        new Date(),
      );

    if (!disminucion_registrada) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    return disminucion_registrada;
  }

  /** Autoriza el dictamen y aplica el precio nuevo solo cuando se aprueba. */
  async dictaminarIncrementoAdmin(
    id_incremento: number,
    datos_dictamen: DictamenIncrementoDto,
  ) {
    const es_administrador = await this.usuarioRepository.esAdministrador(
      datos_dictamen.id_admin,
    );

    if (!es_administrador) {
      throw new ForbiddenException(
        'Solo un administrador puede dictaminar un incremento de presupuesto',
      );
    }

    const incremento =
      await this.servicioRepository.findIncrementoPresupuestoById(
        id_incremento,
      );

    if (!incremento) {
      throw new NotFoundException('Incremento de presupuesto no encontrado');
    }

    if (!incremento.servicio?.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al incremento',
      );
    }

    if (incremento.estadoAprobacion !== 'pendiente') {
      throw new BadRequestException(
        'El incremento de presupuesto ya fue dictaminado',
      );
    }

    const incremento_dictaminado =
      await this.servicioRepository.actualizarDictamenIncremento({
        idIncremento: id_incremento,
        idPropuesta: incremento.servicio.propuesta.idPropuesta,
        estadoAprobacion: datos_dictamen.estado_aprobacion,
        fechaRespuesta: new Date(),
        montoNuevo: Number(incremento.montoNuevo).toFixed(2),
      });

    if (!incremento_dictaminado) {
      throw new BadRequestException(
        'El incremento de presupuesto ya fue dictaminado',
      );
    }

    return incremento_dictaminado;
  }

  /** Lista los incrementos pendientes más antiguos después de validar al administrador. */
  async listarIncrementosPendientesAdmin(id_admin: number) {
    const es_administrador =
      await this.usuarioRepository.esAdministrador(id_admin);

    if (!es_administrador) {
      throw new ForbiddenException(
        'Solo un administrador puede consultar incrementos pendientes',
      );
    }

    return this.servicioRepository.findIncrementosPendientesAdmin();
  }

  /** Lista servicios con sus propuestas, visitas, pagos y presupuestos. */
  listarTodos() {
    return this.servicioRepository.findAll();
  }

  /** Busca el detalle de un servicio y notifica cuando no existe. */
  async obtenerPorId(id_servicio: number) {
    const servicio =
      await this.servicioRepository.findByIdWithDetails(id_servicio);

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    return servicio;
  }

  /** Completa un servicio solo cuando el reparador tiene un pago confirmado. */
  async completarServicio(id_servicio: number, id_reparador: number) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndPagos(id_servicio);

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    if (servicio.propuesta.idReparador !== id_reparador) {
      throw new ForbiddenException(
        'Solo el reparador asignado puede completar este servicio',
      );
    }

    if (servicio.estado === 'cancelado' || servicio.estado === 'completado') {
      throw new BadRequestException(
        'No se puede completar un servicio cancelado o ya completado',
      );
    }

    const existe_pago_valido = servicio.pagos.some(
      (pago) =>
        pago.estado === 'confirmado' || pago.estado === 'aprobado',
    );

    if (!existe_pago_valido) {
      throw new BadRequestException(
        'No se puede completar el servicio sin un pago confirmado o aprobado',
      );
    }

    let servicio_completado;

    try {
      servicio_completado =
        await this.servicioRepository.completarServicio(
          id_servicio,
          new Date(),
        );
    } catch (error) {
      const mensaje_error =
        error instanceof Error ? error.message : 'Error al completar el servicio';

      throw new BadRequestException(mensaje_error);
    }

    if (!servicio_completado) {
      throw new BadRequestException(
        'El servicio ya no está disponible para completarse',
      );
    }

    return servicio_completado;
  }

  /** Registra una nota técnica si el usuario corresponde al reparador asignado. */
  async registrarNotaReparador(datos_nota: CrearNotaTecnicaDto) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        datos_nota.id_servicio,
      );

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    if (servicio.propuesta.idReparador !== datos_nota.id_usuario) {
      throw new ForbiddenException(
        'Solo el reparador asignado puede registrar notas técnicas en este servicio',
      );
    }

    return this.servicioRepository.crearNotaTecnica(
      servicio.propuesta.trabajo.idTrabajo,
      datos_nota.id_servicio,
      datos_nota.id_usuario,
      datos_nota.detalle,
    );
  }

  /** Consulta la bitácora si el usuario participa en el trabajo o es administrador. */
  async obtenerBitacoraTrabajo(
    id_trabajo: number,
    id_usuario: number,
  ) {
    const trabajo =
      await this.servicioRepository.findTrabajoByIdWithPropuestas(
        id_trabajo,
      );

    if (!trabajo) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    const es_cliente =
      trabajo.idCliente === id_usuario;
    const es_reparador_asignado = trabajo.propuestas.some(
      (propuesta) =>
        propuesta.servicio !== null &&
        propuesta.idReparador === id_usuario,
    );
    const es_administrador =
      await this.usuarioRepository.esAdministrador(id_usuario);

    if (
      !es_cliente &&
      !es_reparador_asignado &&
      !es_administrador
    ) {
      throw new ForbiddenException(
        'Solo el cliente, el reparador asignado o un administrador pueden consultar la bitácora',
      );
    }

    const eventos =
      await this.servicioRepository.findBitacoraByTrabajo(id_trabajo);

    return eventos.map((evento) => ({
      ...evento,
      es_nota_manual:
        evento.idServicio !== null &&
        evento.tipoEvento === 'NOTA_REPARADOR',
      es_evento_sistema: evento.idServicio === null,
    }));
  }

  /** Cancela un servicio activo y permite al disparador republicar el trabajo. */
  async cancelarServicio(
    id_servicio: number,
    datos_cancelacion: CancelarServicioDto,
  ) {
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

    const es_cliente =
      servicio.propuesta.trabajo.idCliente === datos_cancelacion.id_usuario;
    const es_reparador =
      servicio.propuesta.idReparador === datos_cancelacion.id_usuario;

    if (!es_cliente && !es_reparador) {
      throw new ForbiddenException(
        'Solo el cliente o el reparador asignado pueden cancelar el servicio',
      );
    }

    if (
      servicio.estado === 'completado' ||
      servicio.estado === 'cancelado'
    ) {
      throw new BadRequestException(
        'No se puede cancelar un servicio completado o ya cancelado',
      );
    }

    const servicio_cancelado =
      await this.servicioRepository.cancelarServicio(id_servicio);

    if (!servicio_cancelado) {
      throw new BadRequestException(
        'El servicio ya no está disponible para cancelarse',
      );
    }

    return servicio_cancelado;
  }
}
