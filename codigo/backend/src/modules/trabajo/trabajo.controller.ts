import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { TrabajoService } from './trabajo.service';
import { FiltroDocumentosTrabajosDto } from '../usuario/dto/filtros-admin.dto';
import { BuscarTecnicosDirectosDto } from './dto/buscar-tecnicos-directos.dto';
import { CoordenadasReparadorDto } from './dto/coordenadas-reparador.dto';
import { CrearTrabajoAbiertoDto } from './dto/crear-trabajo-abierto.dto';
import { CrearTrabajoDirectoDto } from './dto/crear-trabajo-directo.dto';
import { AdjuntarDocumentoTrabajoDto } from './dto/adjuntar-documento-trabajo.dto';
import { ServicioService } from '../servicio/servicio.service';
import { Public, Roles } from '../auth/auth.decorators';
import type { UsuarioAutenticado } from '../auth/jwt-token.service';

type RequestAutenticada = { usuarioAutenticado: UsuarioAutenticado };

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('trabajo')
export class TrabajoController {
  constructor(
    private readonly trabajoService: TrabajoService,
    private readonly servicioService: ServicioService,
  ) {}

  /** Audita documentos adjuntos a trabajos y sus clientes. */
  @Get('admin/documentos')
  @Roles('administrador')
  listarDocumentosTrabajosAdmin(@Query() filtros: FiltroDocumentosTrabajosDto) {
    return this.trabajoService.listarDocumentosTrabajosAdmin(
      filtros.id_admin,
      filtros,
    );
  }

  /** Adjunta evidencia compartida cuando el usuario participa en el trabajo. */
  @Post(':id_trabajo/documentos')
  @Roles('cliente', 'reparador')
  adjuntarDocumento(
    @Param('id_trabajo', ParseIntPipe) id_trabajo: number,
    @Body() datos_documento: AdjuntarDocumentoTrabajoDto,
  ) {
    return this.trabajoService.adjuntarDocumentoCompartido(
      id_trabajo,
      datos_documento,
    );
  }

  /** Lista documentos compartidos para participantes autorizados. */
  @Get(':id_trabajo/documentos')
  @Roles('cliente', 'reparador', 'administrador')
  listarDocumentos(
    @Param('id_trabajo', ParseIntPipe) id_trabajo: number,
    @Query('id_usuario', ParseIntPipe) id_usuario: number,
  ) {
    return this.trabajoService.listarDocumentosTrabajo(
      id_trabajo,
      id_usuario,
    );
  }

  /** Consulta la bitácora técnica del trabajo con control de acceso. */
  @Get(':id_trabajo/bitacora')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerBitacora(
    @Param('id_trabajo', ParseIntPipe) id_trabajo: number,
    @Query('id_usuario', ParseIntPipe) id_usuario: number,
  ) {
    return this.servicioService.obtenerBitacoraTrabajo(
      id_trabajo,
      id_usuario,
    );
  }

  /** Devuelve solicitudes directas y trabajos abiertos priorizados por cobertura. */
  @Get('reparador/:id_reparador/feed')
  @Roles('reparador')
  obtenerFeedReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerFeedReparador(id_reparador);
  }

  /** Devuelve servicios activos y solicitudes directas por prioridad. */
  @Get('portal-reparador/:id_reparador/compromisos')
  @Roles('reparador')
  obtenerBandejaCompromisos(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerBandejaCompromisos(id_reparador);
  }

  /** Devuelve las postulaciones pendientes enviadas por el reparador. */
  @Get('portal-reparador/:id_reparador/postulaciones')
  @Roles('reparador')
  obtenerMisPostulaciones(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerMisPostulaciones(id_reparador);
  }

  /** Explora trabajos abiertos compatibles con las categorías y zonas del reparador. */
  @Get('portal-reparador/:id_reparador/explorar')
  @Roles('reparador')
  explorarTrabajosPublicos(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
    @Query() ubicacion_actual: CoordenadasReparadorDto,
  ) {
    return this.trabajoService.explorarTrabajosPublicos(
      id_reparador,
      ubicacion_actual,
    );
  }

  /** Consulta el historial de trabajos de un cliente. */
  @Get('cliente/:id_cliente/dashboard')
  @Roles('cliente')
  obtenerDashboardCliente(
    @Param('id_cliente', ParseIntPipe) id_cliente: number,
  ) {
    return this.trabajoService.obtenerDashboardCliente(id_cliente);
  }

  /** Busca técnicos habilitados que cubren las coordenadas del cliente. */
  @Get('tecnicos-directos')
  @Public()
  buscarTecnicosDirectos(@Query() filtros: BuscarTecnicosDirectosDto) {
    return this.trabajoService.buscarTecnicosDirectos(filtros);
  }

  /** Publica una nueva solicitud abierta en el marketplace. */
  @Post('abierto')
  @Roles('cliente')
  crearTrabajoAbierto(@Body() datos_trabajo: CrearTrabajoAbiertoDto) {
    return this.trabajoService.crearTrabajoAbierto(datos_trabajo);
  }

  /** Crea una solicitud directa y su propuesta inicial para un técnico. */
  @Post('directo')
  @Roles('cliente')
  crearTrabajoDirecto(@Body() datos_trabajo: CrearTrabajoDirectoDto) {
    return this.trabajoService.crearTrabajoDirecto(datos_trabajo);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  @Roles('administrador')
  listarTodos() {
    return this.trabajoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(
    @Param('id', ParseIntPipe) identificador: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.trabajoService.obtenerPorId(
      identificador,
      request.usuarioAutenticado.sub,
    );
  }
}
