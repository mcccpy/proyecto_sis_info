import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { PagoService } from './pago.service';
import { ConfirmarPagoDto } from './dto/confirmar-pago.dto';
import { DeclararPagoDto } from './dto/declarar-pago.dto';
import { DictamenPagoAdminDto } from './dto/dictamen-pago-admin.dto';
import { Roles } from '../auth/auth.decorators';
import type { UsuarioAutenticado } from '../auth/jwt-token.service';

type RequestAutenticada = { usuarioAutenticado: UsuarioAutenticado };

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('pago')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  /** Registra un pago declarado por el cliente del servicio. */
  @Post('declarar')
  @Roles('cliente')
  declararPago(@Body() datos_pago: DeclararPagoDto) {
    return this.pagoService.declararPago(datos_pago);
  }

  /** Valida un pago declarado mediante una cuenta administradora. */
  @Patch(':id_pago/confirmar')
  @Roles('reparador')
  confirmarPago(
    @Param('id_pago', ParseIntPipe) id_pago: number,
    @Body() datos_confirmacion: ConfirmarPagoDto,
  ) {
    return this.pagoService.confirmarPago(id_pago, datos_confirmacion);
  }

  /** Aprueba o rechaza un pago mediante una cuenta administradora. */
  @Patch(':id_pago/auditar')
  @Roles('administrador')
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
  @Roles('administrador')
  listarTodos() {
    return this.pagoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(
    @Param('id', ParseIntPipe) identificador: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.pagoService.obtenerPorId(
      identificador,
      request.usuarioAutenticado.sub,
    );
  }
}
