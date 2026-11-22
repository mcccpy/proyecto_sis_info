import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TrabajoService } from './trabajo.service';
import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';
import { FiltroDocumentosTrabajosDto } from '../usuario/dto/filtros-admin.dto';
import { BuscarTecnicosDirectosDto } from './dto/buscar-tecnicos-directos.dto';
import { CrearTrabajoAbiertoDto } from './dto/crear-trabajo-abierto.dto';
import { CrearTrabajoDirectoDto } from './dto/crear-trabajo-directo.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('trabajo')
export class TrabajoController {
  constructor(private readonly trabajoService: TrabajoService) {}

  /** Devuelve solicitudes directas y trabajos abiertos priorizados por cobertura. */
  @Get('reparador/:id_reparador/feed')
  obtenerFeedReparador(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerFeedReparador(id_reparador);
  }

  /** Devuelve servicios activos y solicitudes directas por prioridad. */
  @Get('portal-reparador/:id_reparador/compromisos')
  obtenerBandejaCompromisos(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerBandejaCompromisos(id_reparador);
  }

  /** Devuelve las postulaciones pendientes enviadas por el reparador. */
  @Get('portal-reparador/:id_reparador/postulaciones')
  obtenerMisPostulaciones(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.obtenerMisPostulaciones(id_reparador);
  }

  /** Explora trabajos abiertos compatibles con las categorías y zonas del reparador. */
  @Get('portal-reparador/:id_reparador/explorar')
  explorarTrabajosPublicos(
    @Param('id_reparador', ParseIntPipe) id_reparador: number,
  ) {
    return this.trabajoService.explorarTrabajosPublicos(id_reparador);
  }

  /** Audita documentos adjuntos a trabajos y sus clientes. */
  @Get('admin/documentos')
  listarDocumentosTrabajosAdmin(@Query() filtros: FiltroDocumentosTrabajosDto) {
    return this.trabajoService.listarDocumentosTrabajosAdmin(
      filtros.id_admin,
      filtros,
    );
  }

  /** Consulta el historial de trabajos de un cliente. */
  @Get('cliente/:id_cliente/dashboard')
  obtenerDashboardCliente(
    @Param('id_cliente', ParseIntPipe) id_cliente: number,
  ) {
    return this.trabajoService.obtenerDashboardCliente(id_cliente);
  }

  /** Busca técnicos habilitados que cubren las coordenadas del cliente. */
  @Get('tecnicos-directos')
  buscarTecnicosDirectos(@Query() filtros: BuscarTecnicosDirectosDto) {
    return this.trabajoService.buscarTecnicosDirectos(filtros);
  }

  /** Publica una nueva solicitud abierta en el marketplace. */
  @Post('abierto')
  crearTrabajoAbierto(@Body() datos_trabajo: CrearTrabajoAbiertoDto) {
    return this.trabajoService.crearTrabajoAbierto(datos_trabajo);
  }

  /** Crea una solicitud directa y su propuesta inicial para un técnico. */
  @Post('directo')
  crearTrabajoDirecto(@Body() datos_trabajo: CrearTrabajoDirectoDto) {
    return this.trabajoService.crearTrabajoDirecto(datos_trabajo);
  }

  /** Recibe los datos para crear un registro y los entrega al servicio. */
  @Post()
  crear(@Body() datosParaCrearTrabajo: CreateTrabajoDto) {
    return this.trabajoService.crear(datosParaCrearTrabajo);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.trabajoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id') identificadorEnRuta: string) {
    return this.trabajoService.obtenerPorId(Number(identificadorEnRuta));
  }

  /** Entrega al servicio el identificador y los cambios parciales recibidos. */
  @Patch(':id')
  actualizar(
    @Param('id') identificadorEnRuta: string,
    @Body() datosParaActualizarTrabajo: UpdateTrabajoDto,
  ) {
    return this.trabajoService.actualizar(
      Number(identificadorEnRuta),
      datosParaActualizarTrabajo,
    );
  }

  /** Delega al servicio la eliminacion del registro indicado en la ruta. */
  @Delete(':id')
  eliminar(@Param('id') identificadorEnRuta: string) {
    return this.trabajoService.eliminar(Number(identificadorEnRuta));
  }
}
