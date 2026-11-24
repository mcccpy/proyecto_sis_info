import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReclamoService } from './reclamo.service';

function crearReclamoService(fechaFinalizacion: Date | null) {
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => ({
      fechaFinalizacion,
      propuesta: { idReparador: 20, trabajo: { idCliente: 10 } },
    }),
  };
  const reclamoRepository = { crearReclamo: async (datos: unknown) => datos };
  return new ReclamoService(
    reclamoRepository as never,
    servicioRepository as never,
    {} as never,
    {} as never,
  );
}

test('rechaza reclamos de usuarios que no participan del servicio', async () => {
  const service = crearReclamoService(null);
  await assert.rejects(
    service.abrirReclamo({ id_servicio: 5, id_usuario: 99, motivo: 'Motivo' }),
    ForbiddenException,
  );
});

test('rechaza reclamos abiertos más de 60 días después de finalizar', async () => {
  const fecha_antigua = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000);
  const service = crearReclamoService(fecha_antigua);
  await assert.rejects(
    service.abrirReclamo({ id_servicio: 5, id_usuario: 10, motivo: 'Motivo' }),
    BadRequestException,
  );
});
