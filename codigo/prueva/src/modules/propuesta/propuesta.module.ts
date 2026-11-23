import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { PropuestaService } from './propuesta.service';
import { PropuestaController } from './propuesta.controller';
import { PropuestaRepository } from './propuesta.repository';

/** Registra el controlador y el servicio de propuesta para la inyeccion de Nest. */
@Module({
  imports: [PerfilTrabajadorModule],
  controllers: [PropuestaController],
  providers: [PropuestaService, PropuestaRepository],
  exports: [PropuestaRepository],
})
export class PropuestaModule {}
