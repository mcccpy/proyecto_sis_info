import { Module } from '@nestjs/common';
import { PerfilTrabajadorService } from './perfil-trabajador.service';
import { PerfilTrabajadorController } from './perfil-trabajador.controller';
import { PerfilTrabajadorRepository } from './perfil-trabajador.repository';

/** Conecta el perfil profesional con sus operaciones de persistencia. */
@Module({
  controllers: [PerfilTrabajadorController],
  providers: [PerfilTrabajadorService, PerfilTrabajadorRepository],
  exports: [PerfilTrabajadorRepository],
})
export class PerfilTrabajadorModule {}
