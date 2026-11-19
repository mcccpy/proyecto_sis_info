import { Module } from '@nestjs/common';
import { ServicioService } from './servicio.service';
import { ServicioController } from './servicio.controller';

/** Registra el controlador y el servicio de servicio para la inyeccion de Nest. */
@Module({
  controllers: [ServicioController],
  providers: [ServicioService],
})
export class ServicioModule {}
