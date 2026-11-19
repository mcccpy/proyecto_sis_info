import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';

/** Registra el controlador y el servicio de usuario para la inyeccion de Nest. */
@Module({
  controllers: [UsuarioController],
  providers: [UsuarioService],
})
export class UsuarioModule {}
