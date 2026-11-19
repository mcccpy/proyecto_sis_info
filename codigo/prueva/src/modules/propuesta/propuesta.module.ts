import { Module } from '@nestjs/common';
import { PropuestaService } from './propuesta.service';
import { PropuestaController } from './propuesta.controller';

/** Registra el controlador y el servicio de propuesta para la inyeccion de Nest. */
@Module({
  controllers: [PropuestaController],
  providers: [PropuestaService],
})
export class PropuestaModule {}
