import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PerfilTrabajadorService } from './perfil-trabajador.service';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';
import { Roles } from '../auth/auth.decorators';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('perfil-trabajador')
export class PerfilTrabajadorController {
  constructor(
    private readonly perfilTrabajadorService: PerfilTrabajadorService,
  ) {}

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  @Roles('administrador')
  listarTodos() {
    return this.perfilTrabajadorService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(@Param('id', ParseIntPipe) id_usuario: number) {
    return this.perfilTrabajadorService.obtenerPorId(id_usuario);
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  @Roles('reparador')
  actualizar(
    @Param('id', ParseIntPipe) id_usuario: number,
    @Body() datosParaActualizarPerfilTrabajador: UpdatePerfilTrabajadorDto,
  ) {
    return this.perfilTrabajadorService.actualizar(
      id_usuario,
      datosParaActualizarPerfilTrabajador,
    );
  }
}
