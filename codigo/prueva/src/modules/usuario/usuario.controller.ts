import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearUsuario: CreateUsuarioDto) {
    return this.usuarioService.crear(datosParaCrearUsuario);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.usuarioService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.usuarioService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarUsuario: UpdateUsuarioDto,
  ) {
    return this.usuarioService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarUsuario,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.usuarioService.eliminar(Number(identificadorEnRuta));
  }
}
