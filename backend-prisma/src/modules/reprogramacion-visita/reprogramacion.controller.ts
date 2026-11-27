import {
  Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import { SesionService } from '../../auth/sesion.service';
import { ProgramarVisitaDto } from './dto/programar-visita.dto';
import { SolicitarReprogramacionDto } from './dto/solicitar-reprogramacion.dto';
import { ResponderReprogramacionDto } from './dto/responder-reprogramacion.dto';
import { ReprogramacionService } from './reprogramacion.service';

// CONTROLLER: recibe HTTP y pide al servicio realizar la accion.
@Controller('reprogramaciones-visita')
export class ReprogramacionController {
  constructor(
    private readonly servicio: ReprogramacionService,
    private readonly sesion: SesionService,
  ) {}

  // En TODAS las rutas el ID se obtiene de un token firmado, nunca del formulario.
  @Get('servicios')
  servicios(@Headers('authorization') token?: string) {
    return this.servicio.listarServicios(this.sesion.verificar(token));
  }

  @Get('visitas')
  visitas(@Headers('authorization') token?: string) {
    return this.servicio.listarVisitas(this.sesion.verificar(token));
  }

  @Get('visitas/:id/historial')
  historial(@Param('id', ParseIntPipe) id: number,
            @Headers('authorization') token?: string) {
    return this.servicio.historial(id, this.sesion.verificar(token));
  }

  // Ruta auxiliar para crear una visita real durante la demostracion.
  @Post('visitas')
  programar(@Headers('authorization') token: string | undefined,
           @Body() datos: ProgramarVisitaDto) {
    return this.servicio.programar(this.sesion.verificar(token), datos);
  }

  @Post('visitas/:id/solicitudes')
  solicitar(@Param('id', ParseIntPipe) id: number,
            @Headers('authorization') token: string | undefined,
            @Body() datos: SolicitarReprogramacionDto) {
    return this.servicio.solicitar(id, this.sesion.verificar(token), datos);
  }

  @Patch('solicitudes/:id/responder')
  responder(@Param('id', ParseIntPipe) id: number,
            @Headers('authorization') token: string | undefined,
            @Body() datos: ResponderReprogramacionDto) {
    return this.servicio.responder(id, this.sesion.verificar(token), datos);
  }
}
