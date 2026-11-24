import { Module } from '@nestjs/common';
import { PerfilTrabajadorModule } from '../perfil-trabajador/perfil-trabajador.module';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { UsuarioRepository } from './usuario.repository';
import { SecurityModule } from '../auth/security.module';

/** Conecta los endpoints de usuario con sus casos de uso y repositorio. */
@Module({
  imports: [PerfilTrabajadorModule, SecurityModule],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
  exports: [UsuarioRepository, UsuarioService],
})
export class UsuarioModule {}
