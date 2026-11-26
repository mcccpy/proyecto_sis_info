import {
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
import { SesionService } from './sesion.service';

@Controller()
export class CatalogoTrabajadoresController {
  constructor(
    private readonly categoriaService: CategoriaService,
    private readonly perfilTrabajadorService: PerfilTrabajadorService,
    private readonly sesiones: SesionService,
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
    return this.perfilTrabajadorService.listarTodos().then(lista =>
      lista.filter(perfil => perfil.estadoAprobacion === 'aprobado'));
  }

  @Patch('trabajadores/mi-perfil')
  actualizarMiPerfil(
    @Body() body: UpdatePerfilTrabajadorDto,
    @Headers('authorization') autorizacion?: string,
  ) {
    const idUsuario = this.sesiones.verificar(autorizacion);
    // La identidad la determina el token, nunca el primer trabajador de la lista.
    return this.perfilTrabajadorService.actualizarPerfilCompleto(idUsuario, body);
  }
}
