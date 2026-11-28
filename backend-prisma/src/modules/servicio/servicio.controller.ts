import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ServicioService } from './servicio.service';
import { CompletarServicioDto } from './dto/completar-servicio.dto';
import { DictamenIncrementoDto } from './dto/dictamen-incremento.dto';
import { SolicitarAjustePresupuestoDto } from './dto/solicitar-ajuste-presupuesto.dto';
import { CrearNotaTecnicaDto } from './dto/crear-nota-tecnica.dto';
import { CancelarServicioDto } from './dto/cancelar-servicio.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('servicio')
export class ServicioController {
  constructor(private readonly servicioService: ServicioService) {}

  /** Registra una nota técnica del reparador asignado. */
  @Post('bitacora/nota')
  registrarNotaReparador(@Body() datos_nota: CrearNotaTecnicaDto) {
    return this.servicioService.registrarNotaReparador(datos_nota);
  }

  /** Cancela un servicio activo y deja actuar al disparador de republicación. */
  @Patch(':id_servicio/cancelar')
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
  listarIncrementosPendientesAdmin(
    @Query('id_admin', ParseIntPipe) id_admin: number,
  ) {
    return this.servicioService.listarIncrementosPendientesAdmin(id_admin);
  }

  /** Registra el ajuste de presupuesto solicitado para un servicio. */
  @Post(':id_servicio/presupuesto')
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
  dictaminarIncrementoAdmin(
    @Param('id_incremento', ParseIntPipe) id_incremento: number,
    @Body() datos_dictamen: DictamenIncrementoDto,
  ) {
    return this.servicioService.dictaminarIncrementoAdmin(
      id_incremento,
      datos_dictamen,
    );
  }

  /** Lista los servicios e historial presupuestario de un cliente. */
  // Endpoints de lectura para mostrar a cada parte sus servicios e historial de precio.
  @Get('cliente/:id_cliente')
  listarServiciosCliente(
    @Param('id_cliente', ParseIntPipe) id_cliente: number,
  ) {
    return this.servicioService.listarServiciosCliente(id_cliente);
  }

  /** Lista los servicios activos e historial presupuestario de un reparador. */
  @Get('reparador/:id_reparador')
  listarServiciosReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.servicioService.listarServiciosReparador(id_reparador);
  }

  /** Completa un servicio después de comprobar el pago confirmado. */
  @Patch(':id_servicio/completar')
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
  listarTodos() {
    return this.servicioService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.servicioService.obtenerPorId(identificador);
  }
}
