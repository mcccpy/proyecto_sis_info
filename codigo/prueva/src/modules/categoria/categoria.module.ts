import { Module } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CategoriaController } from './categoria.controller';

/** Registra el controlador y el servicio de categoria para la inyeccion de Nest. */
@Module({
  controllers: [CategoriaController],
  providers: [CategoriaService],
})
export class CategoriaModule {}
