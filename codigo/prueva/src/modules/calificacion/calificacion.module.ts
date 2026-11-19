import { Module } from '@nestjs/common';
import { CalificacionService } from './calificacion.service';
import { CalificacionController } from './calificacion.controller';

/** Registra el controlador y el servicio de calificacion para la inyeccion de Nest. */
@Module({
  controllers: [CalificacionController],
  providers: [CalificacionService],
})
export class CalificacionModule {}
