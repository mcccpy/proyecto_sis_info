import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ReclamoService } from './reclamo.service';
import { CrearReclamoDto } from './dto/create-reclamo.dto';
import { FiltroBandejaReclamosAdminDto } from './dto/filtro-bandeja-reclamos-admin.dto';
import { ResolverReclamoAdminDto } from './dto/resolver-reclamo-admin.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('reclamo')
export class ReclamoController {
  constructor(private readonly reclamoService: ReclamoService) {}

  /** Abre un reclamo sobre un servicio para uno de sus participantes. */
  @Post()
  abrirReclamo(@Body() datos_reclamo: CrearReclamoDto) {
    return this.reclamoService.abrirReclamo(datos_reclamo);
  }

  /** Lista los reclamos de un servicio junto a su historial de acciones. */
  @Get('servicio/:id_servicio')
  listarPorServicio(@Param('id_servicio', ParseIntPipe) id_servicio: number) {
    return this.reclamoService.listarPorServicio(id_servicio);
  }

  /** Registra la resolución y la acción administrativa de un reclamo. */
  @Patch(':id_reclamo/resolver')
  gestionarReclamoAdmin(
    @Param('id_reclamo', ParseIntPipe) id_reclamo: number,
    @Body() datos_resolucion: ResolverReclamoAdminDto,
  ) {
    return this.reclamoService.gestionarReclamoAdmin(
      id_reclamo,
      datos_resolucion,
    );
  }

  /** Lista los reclamos con filtros y prioridad de atención para administración. */
  @Get('admin/bandeja')
  listarReclamosAdmin(@Query() filtros: FiltroBandejaReclamosAdminDto) {
    return this.reclamoService.listarReclamosAdmin(filtros);
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.reclamoService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.reclamoService.obtenerPorId(identificador);
  }
}
