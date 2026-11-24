import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { PropuestaService } from './propuesta.service';
import { RetirarPropuestaDto } from './dto/retirar-propuesta.dto';
import { PostularPropuestaDto } from './dto/postular-propuesta.dto';
import { CotizarPropuestaDto } from './dto/cotizar-propuesta.dto';
import { ResolverPropuestaDto } from './dto/resolver-propuesta.dto';
import { Roles } from '../auth/auth.decorators';
import type { UsuarioAutenticado } from '../auth/jwt-token.service';

type RequestAutenticada = { usuarioAutenticado: UsuarioAutenticado };

/**
 * Expone las rutas HTTP y delega cada operacion al servicio del recurso.
 * Aqui solo se traducen datos de la solicitud; no se implementan reglas de negocio.
 */
@Controller('propuesta')
export class PropuestaController {
  constructor(private readonly propuestaService: PropuestaService) {}

  /** Registra una postulación y su cotización inicial. */
  @Post('postular')
  @Roles('reparador')
  postular(@Body() datos_propuesta: PostularPropuestaDto) {
    return this.propuestaService.postular(datos_propuesta);
  }

  /** Actualiza la cotización enviada por el reparador asignado. */
  @Patch(':id_propuesta/cotizar')
  @Roles('reparador')
  cotizar(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_cotizacion: CotizarPropuestaDto,
  ) {
    return this.propuestaService.cotizar(id_propuesta, datos_cotizacion);
  }

  /** Acepta una propuesta por decisión del cliente propietario del trabajo. */
  @Patch(':id_propuesta/aceptar')
  @Roles('cliente')
  aceptarPropuesta(
    @Param('id_propuesta', ParseIntPipe) id_propuesta: number,
    @Body() datos_decision: ResolverPropuestaDto,
  ) {
    return this.propuestaService.aceptarPropuesta(id_propuesta, datos_decision);
  }

  /** Rechaza una propuesta por decisión del cliente propietario del trabajo. */
  @Patch(':id_propuesta/rechazar')
  @Roles('cliente')
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
  @Roles('reparador')
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
  @Roles('administrador')
  listarTodos() {
    return this.propuestaService.listarTodos();
  }

  /** Delega la consulta del registro identificado en la ruta. */
  @Get(':id')
  @Roles('cliente', 'reparador', 'administrador')
  obtenerPorId(
    @Param('id', ParseIntPipe) identificador: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.propuestaService.obtenerPorId(
      identificador,
      request.usuarioAutenticado.sub,
    );
  }
}
