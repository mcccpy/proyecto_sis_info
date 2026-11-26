import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SesionService } from '../../auth/sesion.service';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { PerfilTrabajadorService } from '../perfil-trabajador/perfil-trabajador.service';
import { TrabajoService } from './trabajo.service';

/** Rutas de compatibilidad Angular. Reutilizan las reglas del backend original. */
@Controller('solicitudes')
export class SolicitudesCompatController {
  constructor(
    private readonly trabajos: TrabajoService,
    private readonly usuarios: UsuarioRepository,
    private readonly perfiles: PerfilTrabajadorService,
    private readonly sesiones: SesionService,
  ) {}

  private id(autorizacion: string | undefined) { return this.sesiones.verificar(autorizacion); }

  private async normalizarTrabajo(trabajo: Awaited<ReturnType<TrabajoService['obtenerPorId']>>) {
    const categoria = trabajo.categoriaTrabajos[0]?.categoria;
    return {
      id: trabajo.idTrabajo, titulo: trabajo.titulo,
      descripcion: trabajo.descripcion, direccion: trabajo.direccion,
      zona: trabajo.direccion,
      disponibilidad: trabajo.fechaPreferida ? new Date(trabajo.fechaPreferida).toLocaleString('es-BO') : 'Por coordinar',
      estado: trabajo.estadoPublicacion === 'abierto' ? 'ACTIVA' : trabajo.estadoPublicacion.toUpperCase(),
      creadaEn: trabajo.fechaCreacion,
      categoria: categoria ? { id: categoria.idCategoria, nombre: categoria.nombre } : 'Sin categoría',
      fotoUrl: trabajo.documentoTrabajos[0]?.archivoUrl ?? null,
    };
  }

  @Post()
  async publicar(@Headers('authorization') token: string | undefined, @Body() datos: {
    titulo?: string; descripcion?: string; direccion?: string;
    zona?: string; categoriaId?: number; latitud?: number; longitud?: number;
    fechaPreferida?: string; fotoUrl?: string;
  }) {
    const id = this.id(token);
    if (!(await this.usuarios.tieneRol(id, 'cliente'))) throw new ForbiddenException('Solo los clientes pueden publicar trabajos');
    const cat = Number(datos.categoriaId);
    const lat = Number(datos.latitud), lon = Number(datos.longitud);
    const fecha = String(datos.fechaPreferida || '');
    if (!datos.titulo?.trim() || !datos.descripcion?.trim() || !datos.direccion?.trim() ||
        !Number.isInteger(cat) || cat <= 0 || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180 || !fecha ||
        !Number.isFinite(new Date(fecha).getTime()) || new Date(fecha).getTime() <= Date.now()) {
      throw new BadRequestException('Completa título, descripción, dirección, categoría, coordenadas y fecha futura');
    }
    const url = datos.fotoUrl?.trim();
    if (url && !/^https?:\/\//i.test(url)) throw new BadRequestException('Enlace de foto inválido');
    const creado = await this.trabajos.crearTrabajoAbierto({
      id_cliente: id, direccion: datos.direccion.trim(), latitud: lat, longitud: lon,
      titulo: datos.titulo.trim(), descripcion: datos.descripcion.trim(),
      fecha_preferida: new Date(fecha).toISOString(), categorias: [cat],
      ...(url && { documentos: [{ tipo_documento: 'foto', ubucacion_archivo: url }] }),
    });
    return { id: creado.idTrabajo, estado: 'ACTIVA' };
  }

  @Get('mias')
  async mias(@Headers('authorization') token?: string) {
    const id = this.id(token);
    const dashboard = await this.trabajos.obtenerDashboardCliente(id);
    return Promise.all(dashboard.map(async (item) => this.normalizarTrabajo(await this.trabajos.obtenerPorId(item.id))));
  }

  @Get('disponibles')
  async disponibles(@Headers('authorization') token?: string) {
    const id = this.id(token);
    if (!(await this.usuarios.tieneRol(id, 'reparador'))) throw new ForbiddenException('Necesitas una cuenta de reparador');
    const perfil = await this.perfiles.obtenerPorId(id);
    if (perfil.estadoAprobacion !== 'aprobado') throw new ForbiddenException('Tu perfil todavía requiere aprobación');
    const trabajos = await this.trabajos.explorarTrabajosPublicos(id, {});
    return trabajos.map((t) => ({
      id: t.idTrabajo, titulo: t.titulo, descripcion: t.descripcion,
      zona: t.zona_coincidente || 'Zona del trabajo',
      disponibilidad: new Date(t.fechaPreferida ?? t.fechaCreacion).toLocaleString('es-BO'),
      estado: 'ACTIVA', creadaEn: t.fechaCreacion,
      categoria: t.categoriaTrabajos[0]?.categoria
        ? { id: t.categoriaTrabajos[0].categoria.idCategoria, nombre: t.categoriaTrabajos[0].categoria.nombre }
        : 'Sin categoría',
    }));
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token?: string) {
    return this.trabajos.cancelarTrabajoCliente(id, this.id(token));
  }
}
