import { Module } from '@nestjs/common';
import { SesionService } from '../../auth/sesion.service';
import { ReprogramacionController } from './reprogramacion.controller';
import { ReprogramacionRepository } from './reprogramacion.repository';
import { ReprogramacionService } from './reprogramacion.service';

// NestJS conecta las clases: Controller -> Service -> Repository -> PostgreSQL.
@Module({
  controllers: [ReprogramacionController],
  providers: [SesionService, ReprogramacionService, ReprogramacionRepository],
})
export class ReprogramacionModule {}
