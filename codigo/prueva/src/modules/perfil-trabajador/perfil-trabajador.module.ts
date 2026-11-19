import { Module } from '@nestjs/common';
import { PerfilTrabajadorService } from './perfil-trabajador.service';
import { PerfilTrabajadorController } from './perfil-trabajador.controller';

/** Registra el controlador y el servicio de perfil-trabajador para la inyeccion de Nest. */
@Module({
  controllers: [PerfilTrabajadorController],
  providers: [PerfilTrabajadorService],
})
export class PerfilTrabajadorModule {}
