import { Module } from '@nestjs/common';
import { ReclamoService } from './reclamo.service';
import { ReclamoController } from './reclamo.controller';

/** Registra el controlador y el servicio de reclamo para la inyeccion de Nest. */
@Module({
  controllers: [ReclamoController],
  providers: [ReclamoService],
})
export class ReclamoModule {}
