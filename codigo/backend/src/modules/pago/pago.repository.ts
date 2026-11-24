import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrearPagoData {
  idServicio: number;
  monto: string;
  metodo: 'efectivo' | 'qr' | 'transferencia';
  comprobanteUrl: string;
}

/** Ejecuta las consultas y cambios de estado de los pagos. */
@Injectable()
export class PagoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista pagos con la información del servicio al que corresponden. */
  findAll() {
    return this.prisma.db.orm.public.Pago.include('servicio').all();
  }

  /** Busca un pago junto al servicio relacionado. */
  findById(id_pago: number) {
    return this.prisma.db.orm.public.Pago.include('servicio', (servicio) =>
      servicio.include('propuesta', (propuesta) =>
        propuesta.include('trabajo'),
      ),
    )
      .where({ idPago: id_pago })
      .first();
  }

  /** Obtiene un pago junto al servicio y la propuesta del reparador asignado. */
  findByIdWithServicioAndPropuesta(id_pago: number) {
    return this.prisma.db.orm.public.Pago.include('servicio', (servicio) =>
      servicio.include('propuesta'),
    )
      .where({ idPago: id_pago })
      .first();
  }

  /** Registra un pago declarado por el cliente. */
  crearPago(datos_pago: CrearPagoData) {
    return this.prisma.db.orm.public.Pago.create({
      ...datos_pago,
      estado: 'declarado',
    });
  }

  /** Confirma únicamente pagos que todavía están declarados. */
  confirmarPago(id_pago: number, fecha_confirmacion: Date) {
    return this.prisma.db.orm.public.Pago.where({
      idPago: id_pago,
      estado: 'declarado',
    }).update({
      estado: 'confirmado',
      fechaConfirmacion: fecha_confirmacion,
    });
  }

  /** Actualiza el dictamen administrativo de un pago existente. */
  auditarPago(
    id_pago: number,
    estado: 'aprobado' | 'rechazado',
  ) {
    return this.prisma.db.orm.public.Pago.where({
      idPago: id_pago,
    }).update({ estado });
  }
}
