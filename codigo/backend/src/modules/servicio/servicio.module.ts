import { Module } from '@nestjs/common';
import { ServicioService } from './servicio.service';
import { ServicioController } from './servicio.controller';
import { ServicioRepository } from './servicio.repository';
import { UsuarioModule } from '../usuario/usuario.module';

/** Registra el controlador y el servicio de servicio para la inyeccion de Nest. */
@Module({
  imports: [UsuarioModule],
  controllers: [ServicioController],
  providers: [ServicioService, ServicioRepository],
  exports: [ServicioRepository, ServicioService],
})
export class ServicioModule {}
