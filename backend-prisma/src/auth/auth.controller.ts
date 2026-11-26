import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { RegistroUsuarioDto } from '../modules/usuario/dto/registro-usuario.dto';
import { RolUsuario } from '../modules/usuario/rol-usuario.type';
import { UsuarioService } from '../modules/usuario/usuario.service';
import { SesionService } from './sesion.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly sesiones: SesionService,
  ) {}

  private traducirUsuario(respuesta: unknown) {
    const res = (respuesta && typeof respuesta === 'object' ? respuesta : {}) as Record<string, unknown>;
    const base = (res['usuario'] && typeof res['usuario'] === 'object'
      ? res['usuario'] : res) as Record<string, unknown>;
    const id = Number(base['id_usuario'] ?? base['idUsuario'] ?? base['id'] ?? 0);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('No se pudo identificar el usuario registrado');
    }
    const roles = Array.isArray(base['roles_disponibles'])
      ? base['roles_disponibles'].map((r) => String(r).toLowerCase())
      : [];
    const rol = roles.includes('administrador') ? 'ADMIN'
      : roles.includes('reparador') ? 'TRABAJADOR' : 'CLIENTE';
    return {
      id, nombre: String(base['nombre'] ?? ''),
      email: String(base['email'] ?? ''), rol,
    };
  }

  @Post('registro')
  async registro(@Body() body: {
    nombre?: string; email?: string; telefono?: string; password?: string;
    rol?: string; rol_inicial?: RolUsuario;
    perfil_reparador?: RegistroUsuarioDto['perfil_reparador'];
    documentos?: RegistroUsuarioDto['documentos'];
  }) {
    const rolRaw = String(body.rol_inicial ?? body.rol ?? '').toLowerCase();
    if (rolRaw.includes('empresa')) {
      throw new BadRequestException('El rol empresa aun no esta habilitado');
    }
    const rol_inicial: RolUsuario = rolRaw.includes('trabaj') || rolRaw.includes('repar')
      ? 'reparador' : 'cliente';
    const datos: RegistroUsuarioDto = {
      nombre: body.nombre ?? '', email: body.email ?? '',
      telefono: body.telefono ?? '', password: body.password ?? '',
      rol_inicial, perfil_reparador: body.perfil_reparador, documentos: body.documentos,
    };
    const usuario = this.traducirUsuario(await this.usuarioService.registrarUsuario(datos));
    return { token: this.sesiones.crear(usuario.id), usuario };
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const usuario = this.traducirUsuario(
      await this.usuarioService.loginUsuario(body.email ?? '', body.password ?? ''),
    );
    return { token: this.sesiones.crear(usuario.id), usuario };
  }

  @Get('perfil')
  async perfil(@Headers('authorization') autorizacion?: string) {
    const id = this.sesiones.verificar(autorizacion);
    return this.traducirUsuario(await this.usuarioService.obtenerUsuario(id));
  }
}
