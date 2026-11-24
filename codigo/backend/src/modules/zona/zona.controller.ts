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
import { ZonaService } from './zona.service';
import { CreateZonaReparadorDto } from './dto/create-zona-reparador.dto';
import { UpdateZonaReparadorDto } from './dto/update-zona-reparador.dto';
import { Roles } from '../auth/auth.decorators';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('zona')
export class ZonaController {
  constructor(private readonly zonaService: ZonaService) {}

  /** Lista los puntos de cobertura del perfil profesional indicado. */
  @Get('reparador/:id_reparador')
  @Roles('reparador')
  listarZonasDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.zonaService.listarZonas(id_reparador);
  }

  /** Agrega un punto de cobertura al perfil profesional indicado. */
  @Post('reparador/:id_reparador')
  @Roles('reparador')
  agregarZonaDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Body() datos_zona: CreateZonaReparadorDto,
  ) {
    return this.zonaService.agregarZona(id_reparador, datos_zona);
  }

  /** Actualiza un punto existente únicamente si pertenece al reparador. */
  @Patch('reparador/:id_reparador/:id_zona')
  @Roles('reparador')
  editarZonaDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Param('id_zona', ParseIntPipe) id_zona: number,
    @Body() datos_actualizados: UpdateZonaReparadorDto,
  ) {
    return this.zonaService.editarZona(
      id_reparador,
      id_zona,
      datos_actualizados,
    );
  }

  /** Elimina un punto existente únicamente si pertenece al reparador. */
  @Delete('reparador/:id_reparador/:id_zona')
  @Roles('reparador')
  eliminarZonaDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Param('id_zona', ParseIntPipe) id_zona: number,
  ) {
    return this.zonaService.eliminarZona(id_reparador, id_zona);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  @Roles('administrador')
  listarTodos() {
    return this.zonaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('administrador')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.zonaService.obtenerPorId(identificador);
  }
}
