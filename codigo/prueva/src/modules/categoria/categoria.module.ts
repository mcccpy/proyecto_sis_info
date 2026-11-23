import { Module } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CategoriaController } from './categoria.controller';
import { CategoriaRepository } from './categoria.repository';
import { UsuarioModule } from '../usuario/usuario.module';

/** Registra las rutas de categorías y sus dependencias de persistencia y usuarios. */
@Module({
  imports: [UsuarioModule],
  controllers: [CategoriaController],
  providers: [CategoriaService, CategoriaRepository],
})
export class CategoriaModule {}
