import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ZonaService } from './zona.service';

function crearZonaService(cantidad_zonas: number, zona_actual: unknown = null) {
  const zonaRepository = {
    ejecutarEnTransaccion: async (operacion: (contexto: object) => unknown) =>
      operacion({}),
    bloquearPerfilReparador: async () => ({ idUsuario: 20 }),
    countByReparador: async () => cantidad_zonas,
    createZona: async () => ({ idZona: 1 }),
    findById: async () => zona_actual,
  };
  return new ZonaService(zonaRepository as never, {} as never);
}

const zona_valida = {
  etiqueta: 'Centro',
  latitud: -16.5,
  longitud: -68.15,
  radio_good: 1000,
  radio_medio: 3000,
  radio_bad: 5000,
};

test('impide agregar una cuarta zona de cobertura', async () => {
  const service = crearZonaService(3);
  await assert.rejects(
    service.agregarZona(20, zona_valida),
    BadRequestException,
  );
});

test('rechaza radios que no crecen del anillo verde al rojo', async () => {
  const service = crearZonaService(0);
  await assert.rejects(
    service.agregarZona(20, { ...zona_valida, radio_medio: 1000 }),
    BadRequestException,
  );
});

test('no permite editar la zona de otro reparador', async () => {
  const service = crearZonaService(1, { idReparador: 21 });
  await assert.rejects(
    service.editarZona(20, 3, { etiqueta: 'Nuevo nombre' }),
    ForbiddenException,
  );
});
