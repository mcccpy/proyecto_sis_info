import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ReclamoService } from './reclamo.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { UpdateReclamoDto } from './dto/update-reclamo.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('reclamo')
export class ReclamoController {
  constructor(private readonly reclamoService: ReclamoService) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearReclamo: CreateReclamoDto) {
    return this.reclamoService.crear(datosParaCrearReclamo);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.reclamoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.reclamoService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarReclamo: UpdateReclamoDto,
  ) {
    return this.reclamoService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarReclamo,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.reclamoService.eliminar(Number(identificadorEnRuta));
  }
}
