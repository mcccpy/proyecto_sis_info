import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicioRepository } from '../servicio/servicio.repository';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { ConfirmarPagoDto } from './dto/confirmar-pago.dto';
import { DeclararPagoDto } from './dto/declarar-pago.dto';
import { DictamenPagoAdminDto } from './dto/dictamen-pago-admin.dto';
import { PagoRepository } from './pago.repository';

/** Coordina la declaración del pago por el cliente y su validación administrativa. */
@Injectable()
export class PagoService {
  constructor(
    private readonly pagoRepository: PagoRepository,
    private readonly servicioRepository: ServicioRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Permite que el cliente registre un pago de un servicio vigente. */
  async declararPago(datos_pago: DeclararPagoDto) {
    const servicio =
      await this.servicioRepository.findByIdWithPropuestaAndTrabajo(
        datos_pago.id_servicio,
      );

    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!servicio.propuesta) {
      throw new NotFoundException(
        'No se encontró la propuesta asociada al servicio',
      );
    }

    if (servicio.propuesta.trabajo.idCliente !== datos_pago.id_cliente) {
      throw new ForbiddenException(
        'Solo el cliente del trabajo puede declarar un pago',
      );
    }

    if (servicio.estado === 'cancelado' || servicio.estado === 'completado') {
      throw new BadRequestException(
        'No se puede declarar un pago para un servicio cancelado o completado',
      );
    }

    return this.pagoRepository.crearPago({
      idServicio: datos_pago.id_servicio,
      monto: datos_pago.monto.toFixed(2),
      metodo: datos_pago.metodo,
      comprobanteUrl: datos_pago.comprobante_url,
    });
  }

  /** Confirma un pago declarado únicamente si lo valida el reparador asignado. */
  async confirmarPago(id_pago: number, datos_confirmacion: ConfirmarPagoDto) {
    const pago =
      await this.pagoRepository.findByIdWithServicioAndPropuesta(id_pago);

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (!pago.servicio?.propuesta) {
      throw new NotFoundException('No se encontró el servicio del pago');
    }

    if (
      pago.servicio.propuesta.idReparador !==
      datos_confirmacion.id_reparador
    ) {
      throw new ForbiddenException(
        'Solo el reparador asignado puede confirmar la recepción del pago',
      );
    }

    if (pago.estado !== 'declarado') {
      throw new BadRequestException(
        'Solo se pueden confirmar pagos que estén declarados',
      );
    }

    const pago_confirmado = await this.pagoRepository.confirmarPago(
      id_pago,
      new Date(),
    );

    if (!pago_confirmado) {
      throw new BadRequestException(
        'El pago ya no está disponible para confirmarse',
      );
    }

    return pago_confirmado;
  }

  /** Aprueba o rechaza un pago declarado después de validar al administrador. */
  async aprobarORechazarPagoAdmin(
    id_pago: number,
    datos_dictamen: DictamenPagoAdminDto,
  ) {
    const es_administrador = await this.usuarioRepository.esAdministrador(
      datos_dictamen.id_admin,
    );

    if (!es_administrador) {
      throw new ForbiddenException(
        'Solo un administrador puede dictaminar un pago',
      );
    }

    const pago = await this.pagoRepository.findById(id_pago);

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === 'aprobado' || pago.estado === 'rechazado') {
      throw new BadRequestException(
        'El pago ya fue dictaminado por un administrador',
      );
    }

    const pago_actualizado = await this.pagoRepository.auditarPago(
      id_pago,
      datos_dictamen.estado,
    );

    if (!pago_actualizado) {
      throw new BadRequestException(
        'El pago ya no está disponible para dictaminarse',
      );
    }

    return pago_actualizado;
  }

  /** Lista pagos junto a los servicios relacionados. */
  listarTodos() {
    return this.pagoRepository.findAll();
  }

  /** Busca un pago y notifica cuando el identificador no existe. */
  async obtenerPorId(id_pago: number) {
    const pago = await this.pagoRepository.findById(id_pago);

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }
}
