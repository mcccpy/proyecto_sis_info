import { Module } from '@nestjs/common';
import { UsuarioModule } from '../modules/usuario/usuario.module';
import { CategoriaModule } from '../modules/categoria/categoria.module';
import { PerfilTrabajadorModule } from '../modules/perfil-trabajador/perfil-trabajador.module';
import { AuthController } from './auth.controller';
import { CatalogoTrabajadoresController } from './catalogo-trabajadores.controller';

@Module({
  imports: [UsuarioModule, CategoriaModule, PerfilTrabajadorModule],
  controllers: [AuthController, CatalogoTrabajadoresController],
})
export class AuthModule {}
