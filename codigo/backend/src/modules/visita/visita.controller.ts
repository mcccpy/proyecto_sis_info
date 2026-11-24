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
import { VisitaService } from './visita.service';
import { CambiarEstadoVisitaDto } from './dto/cambiar-estado-visita.dto';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { MarcarVisitaRealizadaDto } from './dto/marcar-visita-realizada.dto';
import { Roles } from '../auth/auth.decorators';
import type { UsuarioAutenticado } from '../auth/jwt-token.service';

type RequestAutenticada = { usuarioAutenticado: UsuarioAutenticado };

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('visita')
export class VisitaController {
  constructor(private readonly visitaService: VisitaService) {}

  /** Agenda una visita para un intervalo acordado por los participantes. */
  @Post('servicio/:id_servicio')
  @Roles('cliente', 'reparador')
  crearVisita(
    @Param('id_servicio', ParseIntPipe) id_servicio: number,
    @Body() datos_visita: CreateVisitaDto,
  ) {
    return this.visitaService.crearVisita(id_servicio, datos_visita);
  }

  /** Cambia el estado de una visita programada a realizada o cancelada. */
  @Patch(':id_visita/estado')
  @Roles('cliente')
  cambiarEstado(
    @Param('id_visita', ParseIntPipe) id_visita: number,
    @Body() datos_cambio: CambiarEstadoVisitaDto,
  ) {
    return this.visitaService.cambiarEstado(id_visita, datos_cambio);
  }

  /** Marca realizada una visita ejecutada por el reparador asignado. */
  @Patch(':id_visita/realizada')
  @Roles('reparador')
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
  @Roles('administrador')
  listarTodos() {
    return this.visitaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(
    @Param('id', ParseIntPipe) id_visita: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.visitaService.obtenerPorId(
      id_visita,
      request.usuarioAutenticado.sub,
    );
  }
}
