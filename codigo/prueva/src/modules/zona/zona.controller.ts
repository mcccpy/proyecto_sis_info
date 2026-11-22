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
import { CreateZonaDto } from './dto/create-zona.dto';
import { UpdateZonaDto } from './dto/update-zona.dto';
import { CreateZonaReparadorDto } from './dto/create-zona-reparador.dto';
import { UpdateZonaReparadorDto } from './dto/update-zona-reparador.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('zona')
export class ZonaController {
  constructor(private readonly zonaService: ZonaService) {}

  /** Lista los puntos de cobertura del perfil profesional indicado. */
  @Get('reparador/:id_reparador')
  listarZonasDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.zonaService.listarZonas(id_reparador);
  }

  /** Agrega un punto de cobertura al perfil profesional indicado. */
  @Post('reparador/:id_reparador')
  agregarZonaDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Body() datos_zona: CreateZonaReparadorDto,
  ) {
    return this.zonaService.agregarZona(id_reparador, datos_zona);
  }

  /** Actualiza un punto existente únicamente si pertenece al reparador. */
  @Patch('reparador/:id_reparador/:id_zona')
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
  eliminarZonaDelReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Param('id_zona', ParseIntPipe) id_zona: number,
  ) {
    return this.zonaService.eliminarZona(id_reparador, id_zona);
  }

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearZona: CreateZonaDto) {
    return this.zonaService.crear(datosParaCrearZona);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.zonaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.zonaService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarZona: UpdateZonaDto,
  ) {
    return this.zonaService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarZona,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.zonaService.eliminar(Number(identificadorEnRuta));
  }
}
