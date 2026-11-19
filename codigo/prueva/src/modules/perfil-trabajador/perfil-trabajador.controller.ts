import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PerfilTrabajadorService } from './perfil-trabajador.service';
import { CreatePerfilTrabajadorDto } from './dto/create-perfil-trabajador.dto';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('perfil-trabajador')
export class PerfilTrabajadorController {
  constructor(
    private readonly perfilTrabajadorService: PerfilTrabajadorService,
  ) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearPerfilTrabajador: CreatePerfilTrabajadorDto) {
    return this.perfilTrabajadorService.crear(datosParaCrearPerfilTrabajador);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.perfilTrabajadorService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.perfilTrabajadorService.obtenerPorId(
      Number(identificadorEnRuta),
    );
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarPerfilTrabajador: UpdatePerfilTrabajadorDto,
  ) {
    return this.perfilTrabajadorService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarPerfilTrabajador,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.perfilTrabajadorService.eliminar(Number(identificadorEnRuta));
  }
}
