import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { PropuestaService } from './propuesta.service';
import { PropuestaController } from './propuesta.controller';
import { PropuestasCompatController } from './propuestas-compat.controller';
import { SesionService } from '../../auth/sesion.service';
import { UsuarioModule } from '../usuario/usuario.module';
import { PropuestaRepository } from './propuesta.repository';

/** Registra el controlador y el servicio de propuesta para la inyeccion de Nest. */
@Module({
  imports: [PerfilTrabajadorModule, UsuarioModule],
  controllers: [PropuestaController, PropuestasCompatController],
  providers: [PropuestaService, PropuestaRepository, SesionService],
  exports: [PropuestaRepository],
})
export class PropuestaModule {}
