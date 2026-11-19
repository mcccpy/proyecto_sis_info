import { Module } from '@nestjs/common';
import { VisitaService } from './visita.service';
import { VisitaController } from './visita.controller';

/** Registra el controlador y el servicio de visita para la inyeccion de Nest. */
@Module({
  controllers: [VisitaController],
  providers: [VisitaService],
})
export class VisitaModule {}
