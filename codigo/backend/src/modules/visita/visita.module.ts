import { Module } from '@nestjs/common';
import { ServicioModule } from '../servicio/servicio.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { VisitaService } from './visita.service';
import { VisitaController } from './visita.controller';
import { VisitaRepository } from './visita.repository';

/** Registra el controlador y el servicio de visita para la inyeccion de Nest. */
@Module({
  imports: [ServicioModule, UsuarioModule],
  controllers: [VisitaController],
  providers: [VisitaService, VisitaRepository],
})
export class VisitaModule {}
