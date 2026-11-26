import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { ZonaService } from './zona.service';
import { ZonaController } from './zona.controller';
import { ZonaRepository } from './zona.repository';

/** Registra las rutas de zona y conecta sus servicios con los repositories. */
@Module({
  imports: [PerfilTrabajadorModule],
  controllers: [ZonaController],
  providers: [ZonaService, ZonaRepository],
})
export class ZonaModule {}
