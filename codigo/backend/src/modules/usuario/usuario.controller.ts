import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AgregarRolDto } from './dto/agregar-rol.dto';
import { AsignarRevocarRolDto } from './dto/asignar-revocar-rol.dto';
import { CambiarModoRolDto } from './dto/cambiar-modo-rol.dto';
import { CrearRolAdminDto } from './dto/crear-rol-admin.dto';
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

  /** Lista los roles existentes después de validar la cuenta administradora. */
  @Get('admin/roles')
  listarRolesAdmin(@Query('id_admin', ParseIntPipe) id_admin: number) {
    return this.usuarioService.listarRolesAdmin(id_admin);
  }

  /** Crea un rol personalizado desde el panel administrativo. */
  @Post('admin/roles')
  crearRolAdmin(@Body() datos_rol: CrearRolAdminDto) {
    return this.usuarioService.crearRolAdmin(datos_rol);
  }

  /** Elimina un rol personalizado y conserva protegidos los roles base. */
  @Delete('admin/roles/:id_rol')
  eliminarRolAdmin(
    @Param('id_rol', ParseIntPipe) id_rol: number,
    @Query('id_admin', ParseIntPipe) id_admin: number,
  ) {
    return this.usuarioService.eliminarRolAdmin(id_admin, id_rol);
  }

  /** Asigna un rol existente a una cuenta indicada por el administrador. */
  @Post('admin/usuario-rol')
  asignarRolManualAdmin(@Body() datos_asignacion: AsignarRevocarRolDto) {
    return this.usuarioService.asignarRolManualAdmin(datos_asignacion);
  }

  /** Revoca un rol asignado a una cuenta indicada por el administrador. */
  @Delete('admin/usuario-rol')
  revocarRolManualAdmin(@Body() datos_asignacion: AsignarRevocarRolDto) {
    return this.usuarioService.revocarRolManualAdmin(datos_asignacion);
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
