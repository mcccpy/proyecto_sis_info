import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { UsuarioService } from '../usuario/usuario.service';
import type { LoginDto } from './login.dto';
import { JwtTokenService, type RolActivo } from './jwt-token.service';

const SAL_DUMMY = 'autenticacion-scrypt-dummy-salt';
const HASH_DUMMY = scryptSync('no-es-una-contrasena-valida', SAL_DUMMY, 64);
const ROLES_BASE: RolActivo[] = ['cliente', 'reparador', 'administrador'];

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly usuarioService: UsuarioService,
    private readonly tokenService: JwtTokenService,
  ) {}

  /** Verifica credenciales y devuelve un JWT para el rol activo de la cuenta. */
  async iniciarSesion(credenciales: LoginDto) {
    const usuario = await this.usuarioRepository.findByEmailForAuth(
      credenciales.email.trim(),
    );
    const hashValido = this.verificarHash(
      credenciales.password,
      usuario?.passwordHash,
    );

    if (!usuario || !hashValido) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const rolesDisponibles: string[] = usuario.usuarioRols.map(
      (asignacion) => String(asignacion.rol.nombre),
    );
    const rolesBaseDisponibles = rolesDisponibles.filter(
      (rol): rol is RolActivo => ROLES_BASE.includes(rol as RolActivo),
    );
    const rolActivo = credenciales.rol_activo
      ? credenciales.rol_activo
      : this.seleccionarRolInicial(rolesBaseDisponibles);

    if (!rolesDisponibles.includes(rolActivo)) {
      throw new ForbiddenException('La cuenta no tiene habilitado ese rol');
    }

    return {
      token: this.tokenService.crearToken(usuario.idUsuario, rolActivo),
      token_type: 'Bearer',
      expires_in: 8 * 60 * 60,
      usuario: {
        id_usuario: usuario.idUsuario,
        nombre: usuario.nombre,
        email: usuario.email,
        roles_disponibles: rolesDisponibles,
        rol_activo: rolActivo,
      },
    };
  }

  /** Devuelve el perfil propio sin exponer el hash de contraseña. */
  obtenerPerfil(id_usuario: number) {
    return this.usuarioService.obtenerUsuario(id_usuario);
  }

  /** Cambia el modo y emite un token firmado con el rol seleccionado. */
  async cambiarRolActivo(
    id_usuario: number,
    rol_objetivo: 'cliente' | 'reparador',
  ) {
    const resultado = await this.usuarioService.cambiarModoRol(id_usuario, {
      rol_objetivo,
    });
    return {
      ...resultado,
      token: this.tokenService.crearToken(id_usuario, rol_objetivo),
      token_type: 'Bearer',
      expires_in: 8 * 60 * 60,
    };
  }

  private seleccionarRolInicial(roles: RolActivo[]): RolActivo {
    const preferidos: RolActivo[] = ['cliente', 'reparador', 'administrador'];
    const seleccionado = preferidos.find((rol) => roles.includes(rol));
    if (!seleccionado) {
      throw new ForbiddenException('La cuenta no tiene un rol habilitado');
    }
    return seleccionado;
  }

  private verificarHash(contrasena: string, hashGuardado?: string): boolean {
    if (!hashGuardado) {
      scryptSync(contrasena, SAL_DUMMY, HASH_DUMMY.length);
      return false;
    }

    const [algoritmo, sal, hashHex, extra] = hashGuardado.split('$');
    if (
      algoritmo !== 'scrypt' ||
      !sal ||
      !hashHex ||
      extra !== undefined ||
      !/^[0-9a-f]+$/i.test(hashHex) ||
      hashHex.length % 2 !== 0
    ) {
      scryptSync(contrasena, SAL_DUMMY, HASH_DUMMY.length);
      return false;
    }

    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = scryptSync(contrasena, sal, esperado.length);
    return (
      calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
    );
  }
}
