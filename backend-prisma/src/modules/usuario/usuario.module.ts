import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { AdminCompatController } from './admin-compat.controller';
import { SesionService } from '../../auth/sesion.service';
import { UsuarioRepository } from './usuario.repository';

@Module({
  imports: [PerfilTrabajadorModule],
  controllers: [UsuarioController, AdminCompatController],
  providers: [UsuarioService, UsuarioRepository, SesionService],
  exports: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}