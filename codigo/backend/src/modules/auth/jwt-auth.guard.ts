import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public, PUBLIC_ROUTE_KEY } from './auth.decorators';
import { JwtTokenService, type UsuarioAutenticado } from './jwt-token.service';

type RequestAutenticada = {
  method: string;
  path: string;
  headers: { authorization?: string };
  params: Record<string, string | undefined>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  usuarioAutenticado?: UsuarioAutenticado;
};

/** Valida JWT en todas las rutas privadas y evita suplantar IDs de actor. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: JwtTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const publico = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publico) return true;

    const request = context.switchToHttp().getRequest<RequestAutenticada>();
    const coincidencia = request.headers.authorization?.match(
      /^Bearer\s+(.+)$/i,
    );
    if (!coincidencia) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }

    const usuario = this.tokenService.verificar(coincidencia[1]);
    this.validarActores(request, usuario);
    request.usuarioAutenticado = usuario;
    return true;
  }

  private validarActores(
    request: RequestAutenticada,
    usuario: UsuarioAutenticado,
  ): void {
    const camposPorRol: Record<string, string[]> = {
      cliente: ['id_cliente', 'id_usuario', 'id_evaluador', 'id_solicitante'],
      reparador: ['id_reparador', 'id_usuario', 'id_solicitante'],
      administrador: ['id_admin', 'id_soporte'],
    };
    const campos = camposPorRol[usuario.rol] ?? [];
    const body = request.body ?? {};
    const query = request.query ?? {};
    for (const campo of campos) {
      this.validarCampoActor(body, campo, usuario.sub);
      this.validarCampoActor(query, campo, usuario.sub);
    }

    const rutasActor: Array<[string, RegExp]> = [
      ['id_reparador', /^\/(?:trabajo\/(?:reparador|portal-reparador)|zona\/reparador)\//],
      ['id_cliente', /^\/trabajo\/cliente\//],
      ['id_reparador', /^\/calificacion\/reparador\//],
    ];
    for (const [campo, ruta] of rutasActor) {
      if (ruta.test(request.path) && request.params[campo] !== undefined) {
        this.validarIdentificador(request.params[campo], usuario.sub);
      }
    }

    if (
      request.method === 'PATCH' &&
      request.path.startsWith('/perfil-trabajador/') &&
      request.params.id !== undefined
    ) {
      this.validarIdentificador(request.params.id, usuario.sub);
    }

    if (
      request.path.startsWith('/usuario/') &&
      !request.path.startsWith('/usuario/admin/') &&
      request.params.id !== undefined
    ) {
      this.validarIdentificador(request.params.id, usuario.sub);
    }
  }

  private validarCampoActor(
    datos: Record<string, unknown>,
    campo: string,
    id_usuario: number,
  ): void {
    if (datos[campo] === undefined) return;
    if (Number(datos[campo]) !== id_usuario) {
      throw new ForbiddenException(
        'La identidad de la petición no coincide con el token de sesión',
      );
    }
    datos[campo] = id_usuario;
  }

  private validarIdentificador(
    id_recibido: string | undefined,
    id_usuario: number,
  ): void {
    if (Number(id_recibido) !== id_usuario) {
      throw new ForbiddenException(
        'Solo puedes acceder a tu propia cuenta o panel',
      );
    }
  }
}
