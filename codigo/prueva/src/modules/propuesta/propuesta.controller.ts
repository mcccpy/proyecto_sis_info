import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { PropuestaService } from './propuesta.service';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { RetirarPropuestaDto } from './dto/retirar-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('propuesta')
export class PropuestaController {
  constructor(private readonly propuestaService: PropuestaService) {}

  /** Retira una postulación si está pendiente y pertenece al reparador indicado. */
  @Patch(':id_propuesta/retirar')
  retirarPostulacion(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_retiro: RetirarPropuestaDto,
  ) {
    return this.propuestaService.retirarPostulacion(
      datos_retiro.id_reparador,
      id_propuesta,
    );
  }

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearPropuesta: CreatePropuestaDto) {
    return this.propuestaService.crear(datosParaCrearPropuesta);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.propuestaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.propuestaService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarPropuesta: UpdatePropuestaDto,
  ) {
    return this.propuestaService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarPropuesta,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.propuestaService.eliminar(Number(identificadorEnRuta));
  }
}
