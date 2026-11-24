import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  Query,
} from '@nestjs/common';
import { ServicioService } from './servicio.service';
import { CompletarServicioDto } from './dto/completar-servicio.dto';
import { DictamenIncrementoDto } from './dto/dictamen-incremento.dto';
import { SolicitarAjustePresupuestoDto } from './dto/solicitar-ajuste-presupuesto.dto';
import { CrearNotaTecnicaDto } from './dto/crear-nota-tecnica.dto';
import { CancelarServicioDto } from './dto/cancelar-servicio.dto';
import { Roles } from '../auth/auth.decorators';
import type { UsuarioAutenticado } from '../auth/jwt-token.service';

type RequestAutenticada = { usuarioAutenticado: UsuarioAutenticado };

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('servicio')
export class ServicioController {
  constructor(private readonly servicioService: ServicioService) {}

  /** Registra una nota técnica del reparador asignado. */
  @Post('bitacora/nota')
  @Roles('reparador')
  registrarNotaReparador(@Body() datos_nota: CrearNotaTecnicaDto) {
    return this.servicioService.registrarNotaReparador(datos_nota);
  }

  /** Cancela como cliente o registra una solicitud pendiente del reparador. */
  @Patch(':id_servicio/cancelar')
  @Roles('cliente', 'reparador')
  cancelarServicio(
    @Param('id_servicio', ParseIntPipe) id_servicio: number,
    @Body() datos_cancelacion: CancelarServicioDto,
  ) {
    return this.servicioService.cancelarServicio(
      id_servicio,
      datos_cancelacion,
    );
  }

  /** Muestra los incrementos pendientes en orden de solicitud. */
  @Get('admin/presupuestos-pendientes')
  @Roles('administrador')
  listarIncrementosPendientesAdmin(
    @Query('id_admin', ParseIntPipe) id_admin: number,
  ) {
    return this.servicioService.listarIncrementosPendientesAdmin(id_admin);
  }

  /** Registra el ajuste de presupuesto solicitado para un servicio. */
  @Post(':id_servicio/presupuesto')
  @Roles('cliente', 'reparador')
  registrarAjustePresupuesto(
    @Param('id_servicio', ParseIntPipe) id_servicio: number,
    @Body() datos_ajuste: SolicitarAjustePresupuestoDto,
  ) {
    return this.servicioService.registrarAjustePresupuesto(
      id_servicio,
      datos_ajuste,
    );
  }

  /** Aprueba o rechaza un incremento pendiente como administrador. */
  @Patch('presupuesto/:id_incremento/dictaminar')
  @Roles('administrador')
  dictaminarIncrementoAdmin(
    @Param('id_incremento', ParseIntPipe) id_incremento: number,
    @Body() datos_dictamen: DictamenIncrementoDto,
  ) {
    return this.servicioService.dictaminarIncrementoAdmin(
      id_incremento,
      datos_dictamen,
    );
  }

  /** Completa un servicio después de comprobar el pago confirmado. */
  @Patch(':id_servicio/completar')
  @Roles('reparador')
  completarServicio(
    @Param('id_servicio', ParseIntPipe) id_servicio: number,
    @Body() datos_completado: CompletarServicioDto,
  ) {
    return this.servicioService.completarServicio(
      id_servicio,
      datos_completado.id_reparador,
    );
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  @Roles('administrador')
  listarTodos() {
    return this.servicioService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(
    @Param('id', ParseIntPipe) identificador: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.servicioService.obtenerPorId(
      identificador,
      request.usuarioAutenticado.sub,
    );
  }
}
