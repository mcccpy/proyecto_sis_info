import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('categoria')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearCategoria: CreateCategoriaDto) {
    return this.categoriaService.crear(datosParaCrearCategoria);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.categoriaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.categoriaService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarCategoria: UpdateCategoriaDto,
  ) {
    return this.categoriaService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarCategoria,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.categoriaService.eliminar(Number(identificadorEnRuta));
  }
}
