import { Module } from '@nestjs/common';
import { TrabajoService } from './trabajo.service';
import { TrabajoController } from './trabajo.controller';

/** Registra el controlador y el servicio de trabajo para la inyeccion de Nest. */
@Module({
  controllers: [TrabajoController],
  providers: [TrabajoService],
})
export class TrabajoModule {}
