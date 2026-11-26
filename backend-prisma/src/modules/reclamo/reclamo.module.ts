import { Module } from '@nestjs/common';
import { ServicioModule } from '../servicio/servicio.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { ReclamoService } from './reclamo.service';
import { ReclamoController } from './reclamo.controller';
import { ReclamoRepository } from './reclamo.repository';

/** Registra el controlador y el servicio de reclamo para la inyeccion de Nest. */
@Module({
  imports: [ServicioModule, UsuarioModule],
  controllers: [ReclamoController],
  providers: [ReclamoService, ReclamoRepository],
})
export class ReclamoModule {}
