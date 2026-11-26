import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';

/** Sesión firmada, con ID del usuario y vencimiento; no es un token de prueba fijo. */
@Injectable()
export class SesionService {
  private obtenerClave(): string {
    const clave = process.env['SESSION_SECRET'];
    if (!clave || clave.length < 32) {
      throw new Error('Configura SESSION_SECRET (minimo 32 caracteres) en backend-prisma/.env');
    }
    return clave;
  }

  crear(idUsuario: number): string {
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      throw new UnauthorizedException('Identificador de usuario invalido');
    }
    const datos = Buffer.from(JSON.stringify({
      sub: idUsuario,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    })).toString('base64url');
    const firma = createHmac('sha256', this.obtenerClave()).update(datos).digest('base64url');
    return `${datos}.${firma}`;
  }

  verificar(cabecera: string | undefined): number {
    if (!cabecera?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }
    const token = cabecera.slice(7).trim();
    const partes = token.split('.');
    if (partes.length !== 2 || !partes[0] || !partes[1]) {
      throw new UnauthorizedException('Sesion invalida');
    }
    const firmaEsperada = createHmac('sha256', this.obtenerClave())
      .update(partes[0]).digest();
    let firmaRecibida: Buffer;
    try { firmaRecibida = Buffer.from(partes[1], 'base64url'); }
    catch { throw new UnauthorizedException('Sesion invalida'); }
    if (firmaEsperada.length !== firmaRecibida.length ||
        !timingSafeEqual(firmaEsperada, firmaRecibida)) {
      throw new UnauthorizedException('Sesion invalida');
    }
    try {
      const datos: unknown = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
      const payload = datos as { sub?: unknown; exp?: unknown };
      const id = Number(payload.sub);
      const expiracion = Number(payload.exp);
      if (!Number.isSafeInteger(id) || id <= 0 ||
          !Number.isFinite(expiracion) || expiracion <= Math.floor(Date.now() / 1000)) {
        throw new Error('invalido');
      }
      return id;
    } catch {
      throw new UnauthorizedException('Sesion invalida o vencida');
    }
  }
}
