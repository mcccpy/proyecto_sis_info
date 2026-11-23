import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PropuestaService } from './propuesta.service';
import { RetirarPropuestaDto } from './dto/retirar-propuesta.dto';
import { PostularPropuestaDto } from './dto/postular-propuesta.dto';
import { CotizarPropuestaDto } from './dto/cotizar-propuesta.dto';
import { ResolverPropuestaDto } from './dto/resolver-propuesta.dto';

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('propuesta')
export class PropuestaController {
  constructor(private readonly propuestaService: PropuestaService) {}

  /** Registra una postulación y su cotización inicial. */
  @Post('postular')
  postular(@Body() datos_propuesta: PostularPropuestaDto) {
    return this.propuestaService.postular(datos_propuesta);
  }

  /** Actualiza la cotización enviada por el reparador asignado. */
  @Patch(':id_propuesta/cotizar')
  cotizar(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_cotizacion: CotizarPropuestaDto,
  ) {
    return this.propuestaService.cotizar(id_propuesta, datos_cotizacion);
  }

  /** Acepta una propuesta por decisión del cliente propietario del trabajo. */
  @Patch(':id_propuesta/aceptar')
  aceptarPropuesta(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_decision: ResolverPropuestaDto,
  ) {
    return this.propuestaService.aceptarPropuesta(id_propuesta, datos_decision);
  }

  /** Rechaza una propuesta por decisión del cliente propietario del trabajo. */
  @Patch(':id_propuesta/rechazar')
  rechazarPropuesta(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_decision: ResolverPropuestaDto,
  ) {
    return this.propuestaService.rechazarPropuesta(
      id_propuesta,
      datos_decision,
    );
  }

  /** Retira una postulación si está pendiente y pertenece al reparador indicado. */
  @Patch(':id_propuesta/retirar')
  retirarPostulacion(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_retiro: RetirarPropuestaDto,
  ) {
    return this.propuestaService.retirarPostulacion(
      datos_retiro.id_reparador,
      id_propuesta,
    );
  }

  /** Delega al servicio la consulta de todos los registros. */
  @Get()
  listarTodos() {
    return this.propuestaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) identificador: number) {
    return this.propuestaService.obtenerPorId(identificador);
  }
}
