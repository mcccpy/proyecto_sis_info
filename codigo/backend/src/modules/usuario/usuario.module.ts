import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { UsuarioRepository } from './usuario.repository';

/** Conecta los endpoints de usuario con sus casos de uso y repositorio. */
@Module({
  imports: [PerfilTrabajadorModule],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
  exports: [UsuarioRepository],
})
export class UsuarioModule {}
