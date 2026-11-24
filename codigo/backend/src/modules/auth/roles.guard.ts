import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { ROLES_KEY } from './auth.decorators';
import type { UsuarioAutenticado } from './jwt-token.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<{
      usuarioAutenticado?: UsuarioAutenticado;
    }>();
    const usuario = request.usuarioAutenticado;
    if (
      !usuario ||
      !roles.includes(usuario.rol) ||
      !(await this.usuarioRepository.tieneRol(usuario.sub, usuario.rol))
    ) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
