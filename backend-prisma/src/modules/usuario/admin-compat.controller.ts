import { Controller, Get, Headers, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { SesionService } from '../../auth/sesion.service';
import { UsuarioService } from './usuario.service';

@Controller('trabajadores')
export class AdminCompatController {
  constructor(private readonly usuarios: UsuarioService, private readonly sesiones: SesionService) {}

  @Get('pendientes')
  async pendientes(@Headers('authorization') token?: string) {
    const idAdmin = this.sesiones.verificar(token);
    const perfiles = await this.usuarios.listarSolicitudesReparadores(idAdmin, {
      id_admin: idAdmin, estado_aprobacion: 'pendiente',
    });
    return perfiles.map(p => ({
      id: p.idUsuario, nombre: p.usuario?.nombre ?? 'Trabajador',
      email: p.usuario?.email ?? '',
      zona: p.zonaReparadors.map(z => z.etiqueta).filter(Boolean).join(', '),
      experiencia: `${p.experienciaAnios ?? 0} año(s)`,
      categoria: p.categoriaReparadors.map(c => c.categoria.nombre).join(', '),
      documentos: p.usuario?.documentoUsuarios.map(d => ({
        id: d.idDocumentoUs, tipo: d.tipoDocumento, estado: d.estado,
        url: d.ubucacionArchivo,
      })) ?? [],
    }));
  }

  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseIntPipe) id: number, @Headers('authorization') token?: string) {
    const idAdmin = this.sesiones.verificar(token);
    return this.usuarios.dictaminarPerfilReparador(id, {
      id_admin: idAdmin, estado_aprobacion: 'aprobado',
    });
  }
}
