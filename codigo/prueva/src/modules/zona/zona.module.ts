import { Module } from '@nestjs/common';
import { ZonaService } from './zona.service';
import { ZonaController } from './zona.controller';

/** Registra el controlador y el servicio de zona para la inyeccion de Nest. */
@Module({
  controllers: [ZonaController],
  providers: [ZonaService],
})
export class ZonaModule {}
