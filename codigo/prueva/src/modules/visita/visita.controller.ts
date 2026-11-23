import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { VisitaService } from './visita.service';
import { CambiarEstadoVisitaDto } from './dto/cambiar-estado-visita.dto';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { MarcarVisitaRealizadaDto } from './dto/marcar-visita-realizada.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('visita')
export class VisitaController {
  constructor(private readonly visitaService: VisitaService) {}

  /** Agenda una visita para un intervalo acordado por los participantes. */
  @Post('servicio/:id_servicio')
  crearVisita(
    @Param('id_servicio', ParseIntPipe) id_servicio: number,
    @Body() datos_visita: CreateVisitaDto,
  ) {
    return this.visitaService.crearVisita(id_servicio, datos_visita);
  }

  /** Cambia el estado de una visita programada a realizada o cancelada. */
  @Patch(':id_visita/estado')
  cambiarEstado(
    @Param('id_visita', ParseIntPipe) id_visita: number,
    @Body() datos_cambio: CambiarEstadoVisitaDto,
  ) {
    return this.visitaService.cambiarEstado(id_visita, datos_cambio);
  }

  /** Marca realizada una visita ejecutada por el reparador asignado. */
  @Patch(':id_visita/realizada')
  marcarVisitaRealizada(
    @Param('id_visita', ParseIntPipe) id_visita: number,
    @Body() datos_realizacion: MarcarVisitaRealizadaDto,
  ) {
    return this.visitaService.marcarVisitaRealizada(
      id_visita,
      datos_realizacion,
    );
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.visitaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id_visita: number) {
    return this.visitaService.obtenerPorId(id_visita);
  }
}
