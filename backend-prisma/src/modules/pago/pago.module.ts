import { Module } from '@nestjs/common';
import { ServicioModule } from '../servicio/servicio.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { PagoRepository } from './pago.repository';

/** Registra el controlador y el servicio de pago para la inyeccion de Nest. */
@Module({
  imports: [ServicioModule, UsuarioModule],
  controllers: [PagoController],
  providers: [PagoService, PagoRepository],
})
export class PagoModule {}
