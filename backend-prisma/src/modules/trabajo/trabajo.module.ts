import { Module } from '@nestjs/common';
import { TrabajoService } from './trabajo.service';
import { TrabajoController } from './trabajo.controller';
import { TrabajoRepository } from './trabajo.repository';
import { PropuestaModule } from '../propuesta/propuesta.module';
import { ServicioModule } from '../servicio/servicio.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';

/** Registra las rutas de trabajo y conecta la consulta del feed. */
@Module({
  imports: [
    PropuestaModule,
    ServicioModule,
    UsuarioModule,
    PerfilTrabajadorModule,
  ],
  controllers: [TrabajoController],
  providers: [TrabajoService, TrabajoRepository],
})
export class TrabajoModule {}
