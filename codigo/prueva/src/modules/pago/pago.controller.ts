import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PagoService } from './pago.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('pago')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearPago: CreatePagoDto) {
    return this.pagoService.crear(datosParaCrearPago);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.pagoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.pagoService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarPago: UpdatePagoDto,
  ) {
    return this.pagoService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarPago,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.pagoService.eliminar(Number(identificadorEnRuta));
  }
}
