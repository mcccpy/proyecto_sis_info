import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AgregarRolDto } from './dto/agregar-rol.dto';
import { CambiarModoRolDto } from './dto/cambiar-modo-rol.dto';
import {
  DictamenDocumentoDto,
  DictamenReparadorDto,
} from './dto/dictamen-admin.dto';
import {
  ConsultaAdminDto,
  FiltroDocumentosClientesDto,
  FiltroModeracionReparadoresDto,
} from './dto/filtros-admin.dto';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { UsuarioService } from './usuario.service';

/** Expone las rutas de cuenta y delega las reglas al servicio de usuarios. */
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  /** Registra una cuenta con el rol elegido durante el alta. */
  @Post('registro')
  registrar(@Body() datosRegistro: RegistroUsuarioDto) {
    return this.usuarioService.registrarUsuario(datosRegistro);
  }

  /** Lista solicitudes de inscripción priorizando las que esperan revisión. */
  @Get('admin/reparadores')
  listarSolicitudesReparadores(
    @Query() filtros: FiltroModeracionReparadoresDto,
  ) {
    return this.usuarioService.listarSolicitudesReparadores(
      filtros.id_admin,
      filtros,
    );
  }

  /** Devuelve el detalle administrativo de un perfil reparador. */
  @Get('admin/reparadores/:id_reparador')
  obtenerDetalleReparadorAdmin(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Query() consulta_admin: ConsultaAdminDto,
  ) {
    return this.usuarioService.obtenerDetalleReparadorAdmin(
      consulta_admin.id_admin,
      id_reparador,
    );
  }

  /** Aprueba o rechaza el perfil profesional de un reparador. */
  @Patch('admin/reparadores/:id_reparador/estado')
  dictaminarPerfilReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Body() dictamen: DictamenReparadorDto,
  ) {
    return this.usuarioService.dictaminarPerfilReparador(
      id_reparador,
      dictamen,
    );
  }

  /** Lista documentos asociados a usuarios que tienen el rol cliente. */
  @Get('admin/documentos-clientes')
  listarDocumentosClientes(@Query() filtros: FiltroDocumentosClientesDto) {
    return this.usuarioService.listarDocumentosClientes(
      filtros.id_admin,
      filtros,
    );
  }

  /** Aprueba o rechaza un documento de usuario. */
  @Patch('admin/documentos-usuario/:id_documento/estado')
  revisarDocumentoUsuario(
    @Param('id_documento', ParseIntPipe) id_documento: number,
    @Body() dictamen: DictamenDocumentoDto,
  ) {
    return this.usuarioService.revisarDocumentoUsuario(id_documento, dictamen);
  }

  /** Obtiene la cuenta, sus roles, documentos y el perfil profesional asociado. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) idUsuario: number) {
    return this.usuarioService.obtenerUsuario(idUsuario);
  }

  /** Agrega un rol sin quitar los roles que ya tiene la cuenta. */
  @Post(':id/agregar-rol')
  agregarRol(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() datosNuevoRol: AgregarRolDto,
  ) {
    return this.usuarioService.agregarRol(idUsuario, datosNuevoRol);
  }

  /** Selecciona un rol existente para la sesion actual; no lo persiste en la cuenta. */
  @Patch(':id/cambiar-rol')
  cambiarModoRol(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() datosCambioRol: CambiarModoRolDto,
  ) {
    return this.usuarioService.cambiarModoRol(idUsuario, datosCambioRol);
  }
}
