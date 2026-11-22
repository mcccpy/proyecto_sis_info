import { Module } from '@nestjs/common';
import { ServicioService } from './servicio.service';
import { ServicioController } from './servicio.controller';
import { ServicioRepository } from './servicio.repository';

/** Registra el controlador y el servicio de servicio para la inyeccion de Nest. */
@Module({
  controllers: [ServicioController],
  providers: [ServicioService, ServicioRepository],
  exports: [ServicioRepository],
})
export class ServicioModule {}
