import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type RolActivo = 'cliente' | 'reparador' | 'administrador';

export interface UsuarioAutenticado {
  sub: number;
  rol: RolActivo;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtTokenService {
  private readonly duracionSegundos = 8 * 60 * 60;

  crearToken(id_usuario: number, rol: RolActivo): string {
    const ahora = Math.floor(Date.now() / 1000);
    const encabezado = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const cuerpo = Buffer.from(
      JSON.stringify({
        sub: id_usuario,
        rol,
        iat: ahora,
        exp: ahora + this.duracionSegundos,
      }),
    ).toString('base64url');
    const contenido = `${encabezado}.${cuerpo}`;
    return `${contenido}.${this.firmar(contenido)}`;
  }

  verificar(token: string): UsuarioAutenticado {
    const partes = token.split('.');
    if (partes.length !== 3) {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    const [parteHeader, partePayload, firma] = partes;
    let encabezado: { alg?: string; typ?: string };
    let payload: Partial<UsuarioAutenticado>;
    try {
      encabezado = JSON.parse(
        Buffer.from(parteHeader, 'base64url').toString('utf8'),
      );
      payload = JSON.parse(
        Buffer.from(partePayload, 'base64url').toString('utf8'),
      );
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    if (encabezado.alg !== 'HS256' || encabezado.typ !== 'JWT') {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    const firmaEsperada = Buffer.from(
      this.firmar(`${parteHeader}.${partePayload}`),
      'base64url',
    );
    const firmaRecibida = Buffer.from(firma, 'base64url');
    if (
      firmaRecibida.length !== firmaEsperada.length ||
      !timingSafeEqual(firmaRecibida, firmaEsperada)
    ) {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    const ahora = Math.floor(Date.now() / 1000);
    if (
      !Number.isSafeInteger(payload.sub) ||
      payload.sub! < 1 ||
      !['cliente', 'reparador', 'administrador'].includes(payload.rol ?? '') ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat! > ahora + 60 ||
      payload.exp! <= ahora
    ) {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    return payload as UsuarioAutenticado;
  }

  private firmar(contenido: string): string {
    const secreto = process.env.JWT_SECRET;
    if (!secreto || Buffer.byteLength(secreto, 'utf8') < 32) {
      throw new ServiceUnavailableException(
        'La variable JWT_SECRET debe contener al menos 32 bytes aleatorios',
      );
    }
    return createHmac('sha256', secreto).update(contenido).digest('base64url');
  }
}
