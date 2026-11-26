import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Query,
} from '@nestjs/common';
import { CategoriaService } from '../modules/categoria/categoria.service';
import { PerfilTrabajadorService } from '../modules/perfil-trabajador/perfil-trabajador.service';
import { UpdatePerfilTrabajadorDto } from '../modules/perfil-trabajador/dto/update-perfil-trabajador.dto';

@Controller()
export class CatalogoTrabajadoresController {
  constructor(
    private readonly categoriaService: CategoriaService,
    private readonly perfilTrabajadorService: PerfilTrabajadorService,
  ) {}

  @Get('catalogo/categorias')
  listarCategorias() {
    return this.categoriaService.listarCategorias();
  }

  @Get('trabajadores')
  listarTrabajadores(
    @Query('categoria') _categoria?: string,
    @Query('zona') _zona?: string,
  ) {
    return this.perfilTrabajadorService.listarTodos();
  }

  @Patch('trabajadores/mi-perfil')
  async actualizarMiPerfil(
    @Body() body: UpdatePerfilTrabajadorDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    let idUsuario = Number(body?.idUsuario ?? headerUserId ?? 0) || 0;

    if (!idUsuario) {
      const todos = await this.perfilTrabajadorService.listarTodos();
      const lista = Array.isArray(todos) ? todos : [];
      const primero = lista[0] as Record<string, unknown> | undefined;
      idUsuario = Number(primero?.idUsuario ?? primero?.id_usuario ?? 0) || 0;
    }

    if (!idUsuario) {
      throw new BadRequestException(
        'No se pudo identificar el usuario del perfil profesional',
      );
    }

    return this.perfilTrabajadorService.actualizarPerfilCompleto(
      idUsuario,
      body,
    );
  }
}
