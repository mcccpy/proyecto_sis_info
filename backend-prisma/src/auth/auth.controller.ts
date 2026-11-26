import { Body, Controller, Post } from '@nestjs/common';
import { RegistroUsuarioDto } from '../modules/usuario/dto/registro-usuario.dto';
import { RolUsuario } from '../modules/usuario/rol-usuario.type';
import { UsuarioService } from '../modules/usuario/usuario.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post('registro')
  async registro(
    @Body()
    body: {
      nombre?: string;
      email?: string;
      telefono?: string;
      password?: string;
      rol?: string;
      rol_inicial?: RolUsuario;
      perfil_reparador?: RegistroUsuarioDto['perfil_reparador'];
      documentos?: RegistroUsuarioDto['documentos'];
    },
  ) {
    const rolRaw = String(body.rol_inicial ?? body.rol ?? '').toLowerCase();
    const rol_inicial: RolUsuario =
      rolRaw.includes('trabaj') || rolRaw.includes('repar')
        ? 'reparador'
        : 'cliente';

    const dto: RegistroUsuarioDto = {
      nombre: body.nombre ?? '',
      email: body.email ?? '',
      telefono:
        body.telefono?.trim() ||
        `t-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`,
      password: body.password ?? '',
      rol_inicial,
      perfil_reparador: body.perfil_reparador,
      documentos: body.documentos,
    };

    const creado = await this.usuarioService.registrarUsuario(dto);
    const usuarioBase =
      creado && typeof creado === 'object' && 'usuario' in creado
        ? (creado as { usuario: Record<string, unknown> }).usuario
        : (creado as Record<string, unknown>);

    const rolRespuesta =
      rol_inicial === 'reparador' ? 'TRABAJADOR' : 'CLIENTE';

    return {
      token: 'dev-session-token',
      usuario: {
        ...usuarioBase,
        rol: usuarioBase?.rol ?? rolRespuesta,
      },
    };
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email?: string;
      password?: string;
    },
  ) {
    const res = await this.usuarioService.loginUsuario(
      body.email ?? '',
      body.password ?? '',
    );
    const base =
      res && typeof res === 'object' && 'usuario' in res
        ? (res as { usuario: Record<string, unknown> }).usuario
        : (res as Record<string, unknown>);

    const rolesRaw = Array.isArray((res as Record<string, unknown>)?.roles)
      ? ((res as Record<string, unknown>).roles as string[])
      : [];
    const rolesTexto = JSON.stringify([...rolesRaw, base]).toLowerCase();

    let rolFinal = String(base?.rol ?? '').toUpperCase();
    if (!rolFinal) {
      if (rolesTexto.includes('admin')) {
        rolFinal = 'ADMIN';
      } else if (rolesTexto.includes('repar') || rolesTexto.includes('trabaj')) {
        rolFinal = 'TRABAJADOR';
      } else {
        rolFinal = 'CLIENTE';
      }
    }

    return {
      token: 'dev-session-token',
      usuario: {
        ...base,
        rol: rolFinal,
      },
    };
  }
}

