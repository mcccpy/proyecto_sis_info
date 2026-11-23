import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PagoService } from './pago.service';
import { ConfirmarPagoDto } from './dto/confirmar-pago.dto';
import { DeclararPagoDto } from './dto/declarar-pago.dto';
import { DictamenPagoAdminDto } from './dto/dictamen-pago-admin.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('pago')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  /** Registra un pago declarado por el cliente del servicio. */
  @Post('declarar')
  declararPago(@Body() datos_pago: DeclararPagoDto) {
    return this.pagoService.declararPago(datos_pago);
  }

  /** Valida un pago declarado mediante una cuenta administradora. */
  @Patch(':id_pago/confirmar')
  confirmarPago(
    @Param('id_pago', ParseIntPipe) id_pago: number,
    @Body() datos_confirmacion: ConfirmarPagoDto,
  ) {
    return this.pagoService.confirmarPago(id_pago, datos_confirmacion);
  }

  /** Aprueba o rechaza un pago mediante una cuenta administradora. */
  @Patch(':id_pago/auditar')
  aprobarORechazarPagoAdmin(
    @Param('id_pago', ParseIntPipe) id_pago: number,
    @Body() datos_dictamen: DictamenPagoAdminDto,
  ) {
    return this.pagoService.aprobarORechazarPagoAdmin(
      id_pago,
      datos_dictamen,
    );
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.pagoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.pagoService.obtenerPorId(identificador);
  }
}
