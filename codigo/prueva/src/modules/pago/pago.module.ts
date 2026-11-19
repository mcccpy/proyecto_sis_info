import { Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';

/** Registra el controlador y el servicio de pago para la inyeccion de Nest. */
@Module({
  controllers: [PagoController],
  providers: [PagoService],
})
export class PagoModule {}
