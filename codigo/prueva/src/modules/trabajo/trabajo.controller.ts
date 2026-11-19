import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TrabajoService } from './trabajo.service';
import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('trabajo')
export class TrabajoController {
  constructor(private readonly trabajoService: TrabajoService) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearTrabajo: CreateTrabajoDto) {
    return this.trabajoService.crear(datosParaCrearTrabajo);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.trabajoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.trabajoService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarTrabajo: UpdateTrabajoDto,
  ) {
    return this.trabajoService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarTrabajo,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.trabajoService.eliminar(Number(identificadorEnRuta));
  }
}
