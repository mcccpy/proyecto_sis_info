import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CalificacionService } from './calificacion.service';
import { CrearCalificacionDto } from './dto/create-calificacion.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('calificacion')
export class CalificacionController {
  constructor(private readonly calificacionService: CalificacionService) {}

  /** Crea una calificación bajo las reglas de participantes y estado del servicio. */
  @Post()
  crearCalificacion(@Body() datos_calificacion: CrearCalificacionDto) {
    return this.calificacionService.crearCalificacion(datos_calificacion);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.calificacionService.listarTodos();
  }

  /** Lista las calificaciones recibidas por un reparador y su promedio. */
  @Get('reparador/:id_reparador')
  listarPorReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.calificacionService.listarPorReparador(id_reparador);
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.calificacionService.obtenerPorId(identificador);
  }
}
