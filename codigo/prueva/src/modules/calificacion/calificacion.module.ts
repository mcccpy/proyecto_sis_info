import { Module } from '@nestjs/common';
import { ServicioModule } from '../servicio/servicio.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { CalificacionService } from './calificacion.service';
import { CalificacionController } from './calificacion.controller';
import { CalificacionRepository } from './calificacion.repository';

/** Registra el controlador y el servicio de calificacion para la inyeccion de Nest. */
@Module({
  imports: [ServicioModule, UsuarioModule],
  controllers: [CalificacionController],
  providers: [CalificacionService, CalificacionRepository],
})
export class CalificacionModule {}
