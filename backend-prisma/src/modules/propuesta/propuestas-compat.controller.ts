import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SesionService } from '../../auth/sesion.service';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { PropuestaRepository } from './propuesta.repository';
import { PropuestaService } from './propuesta.service';

@Controller('propuestas')
export class PropuestasCompatController {
  constructor(
    private readonly propuestas: PropuestaService,
    private readonly repositorio: PropuestaRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly sesiones: SesionService,
  ) {}

  private id(token?: string) { return this.sesiones.verificar(token); }
  private async mapear(p: Awaited<ReturnType<PropuestaRepository['findById']>>) {
    if (!p) return null;
    const usuario = await this.usuarios.findById(p.idReparador);
    // La ruta compatible conserva el formato de estado que consume el frontend.
    return {
      id: p.idPropuesta, estado: p.estado.toUpperCase(), precio: String(p.precioTotal),
      costoVisita: String(p.costoVisita), materialesIncluidos: p.materialesIncluidos,
      detalleMateriales: p.detalleMateriales ?? '',
      solicitud: p.trabajo?.titulo ?? 'Solicitud no disponible',
      trabajador: { id: p.idReparador, nombre: usuario?.nombre ?? `Técnico #${p.idReparador}` },
    };
  }

  @Get('solicitud/:id')
  async porSolicitud(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token?: string) {
    const cliente = this.id(token);
    const todas = await this.repositorio.findAll();
    const propias = todas.filter(p => p.idTrabajo === id && p.trabajo?.idCliente === cliente);
    return (await Promise.all(propias.map(p => this.repositorio.findById(p.idPropuesta).then(x => this.mapear(x))))).filter(Boolean);
  }

  @Get('mias')
  async mias(@Headers('authorization') token?: string) {
    const reparador = this.id(token);
    if (!(await this.usuarios.tieneRol(reparador, 'reparador'))) throw new ForbiddenException('Necesitas una cuenta de trabajador');
    const todas = await this.repositorio.findAll();
    const propias = todas.filter(p => p.idReparador === reparador);
    return (await Promise.all(propias.map(p => this.repositorio.findById(p.idPropuesta).then(x => this.mapear(x))))).filter(Boolean);
  }

  @Post('solicitud/:id')
  async enviar(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token: string | undefined,
              @Body() datos: { precio?: number; costoVisita?: number; materialesIncluidos?: boolean; detalleMateriales?: string }) {
    const reparador = this.id(token);
    if (!(await this.usuarios.tieneRol(reparador, 'reparador'))) throw new ForbiddenException('Necesitas una cuenta de trabajador');
    const precio = Number(datos.precio), visita = Number(datos.costoVisita ?? 0);
    if (!Number.isFinite(precio) || precio <= 0 || !Number.isFinite(visita) || visita < 0 ||
        typeof datos.materialesIncluidos !== 'boolean') throw new BadRequestException('Revisa los datos de la cotización');
    const creado = await this.propuestas.postular({
      id_trabajo: id, id_reparador: reparador,
      precio_total: precio, costo_visita: visita,
      materiales_incluidos: datos.materialesIncluidos,
      ...(datos.detalleMateriales?.trim() && { detalle_materiales: datos.detalleMateriales.trim() }),
    });
    return this.mapear(creado);
  }

  @Patch(':id/aceptar')
  aceptar(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token?: string) {
    return this.propuestas.aceptarPropuesta(id, { id_cliente: this.id(token) });
  }

  // Expone el rechazo para el cliente usando la identidad de la sesión actual.
  @Patch(':id/rechazar')
  rechazar(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token?: string) {
    return this.propuestas.rechazarPropuesta(id, { id_cliente: this.id(token) });
  }
}
