import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { Public, Roles } from '../auth/auth.decorators';
import { CrearCategoriaAdminDto } from './dto/crear-categoria-admin.dto';
import { CategoriaReparadorAdminDto } from './dto/categoria-reparador-admin.dto';
import { CategoriaTrabajoAdminDto } from './dto/categoria-trabajo-admin.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('categoria')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  /** Crea una categoría desde el panel administrativo. */
  @Post('admin')
  @Roles('administrador')
  crearCategoriaAdmin(@Body() datos_categoria: CrearCategoriaAdminDto) {
    return this.categoriaService.crearCategoriaAdmin(datos_categoria);
  }

  /** Asigna una categoría a un reparador desde el panel administrativo. */
  @Post('admin/reparador')
  @Roles('administrador')
  asignarCategoriaAReparador(
    @Body() datos_asignacion: CategoriaReparadorAdminDto,
  ) {
    return this.categoriaService.asignarCategoriaAReparador(datos_asignacion);
  }

  /** Quita una categoría asignada a un reparador desde el panel administrativo. */
  @Delete('admin/reparador')
  @Roles('administrador')
  quitarCategoriaAReparador(
    @Body() datos_asignacion: CategoriaReparadorAdminDto,
  ) {
    return this.categoriaService.quitarCategoriaAReparador(datos_asignacion);
  }

  /** Asigna una categoría a un trabajo desde el panel administrativo. */
  @Post('admin/trabajo')
  @Roles('administrador')
  asignarCategoriaATrabajo(@Body() datos_asignacion: CategoriaTrabajoAdminDto) {
    return this.categoriaService.asignarCategoriaATrabajo(datos_asignacion);
  }

  /** Quita una categoría asignada a un trabajo desde el panel administrativo. */
  @Delete('admin/trabajo')
  @Roles('administrador')
  quitarCategoriaATrabajo(@Body() datos_asignacion: CategoriaTrabajoAdminDto) {
    return this.categoriaService.quitarCategoriaATrabajo(datos_asignacion);
  }

  /** Elimina una categoría y sus asociaciones registradas. */
  @Delete('admin/:id_categoria')
  @Roles('administrador')
  eliminarCategoriaAdmin(
    @Param('id_categoria', ParseIntPipe) id_categoria: number,
    @Query('id_admin', ParseIntPipe) id_admin: number,
  ) {
    return this.categoriaService.eliminarCategoriaAdmin(id_admin, id_categoria);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  @Public()
  listarTodos() {
    return this.categoriaService.listarCategorias();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Public()
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.categoriaService.obtenerPorId(identificador);
  }
}
