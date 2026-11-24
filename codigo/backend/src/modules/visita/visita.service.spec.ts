import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { VisitaService } from './visita.service';

function crearVisitaService(
  resultado: unknown = { resultado: 'solapamiento' },
) {
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => ({
      estado: 'programado',
      propuesta: { idReparador: 20, trabajo: { idCliente: 10 } },
    }),
  };
  const visitaRepository = {
    crearSiNoSeSolapa: async () => resultado,
  };
  return new VisitaService(
    visitaRepository as never,
    servicioRepository as never,
  );
}

const intervalo_valido = {
  id_usuario: 20,
  fecha_inicio: '2027-01-01T10:00:00.000Z',
  fecha_fin: '2027-01-01T11:00:00.000Z',
};

test('rechaza agendar una visita cuando el reparador ya tiene un cruce', async () => {
  const service = crearVisitaService({ resultado: 'solapamiento' });
  await assert.rejects(
    service.crearVisita(5, intervalo_valido),
    ConflictException,
  );
});

test('rechaza intervalos con fin anterior o igual al inicio', async () => {
  const service = crearVisitaService();
  await assert.rejects(
    service.crearVisita(5, {
      ...intervalo_valido,
      fecha_fin: intervalo_valido.fecha_inicio,
    }),
    BadRequestException,
  );
});

test('solo los participantes del trabajo pueden agendar visitas', async () => {
  const service = crearVisitaService();
  await assert.rejects(
    service.crearVisita(5, { ...intervalo_valido, id_usuario: 99 }),
    ForbiddenException,
  );
});

function crearVisitaServiceParaCancelar(estado_servicio: string) {
  const visitaRepository = {
    findByIdWithParticipants: async () => ({
      estado: 'programada',
      servicio: {
        estado: estado_servicio,
        propuesta: { idReparador: 20, trabajo: { idCliente: 10 } },
      },
    }),
    actualizarEstadoProgramada: async () => ({ estado: 'cancelada' }),
  };
  return new VisitaService(
    visitaRepository as never,
    {} as never,
  );
}

test('solo el cliente puede cancelar una visita programada', async () => {
  const service = crearVisitaServiceParaCancelar('programado');
  await assert.rejects(
    service.cambiarEstado(5, { id_usuario: 20, estado: 'cancelada' }),
    ForbiddenException,
  );
});

test('el cliente puede cancelar la visita antes de iniciar el servicio', async () => {
  const service = crearVisitaServiceParaCancelar('programado');
  const result = await service.cambiarEstado(5, {
    id_usuario: 10,
    estado: 'cancelada',
  });
  assert.equal(result.estado, 'cancelada');
});

test('no permite cancelar una visita después de iniciar el servicio', async () => {
  const service = crearVisitaServiceParaCancelar('en_progreso');
  await assert.rejects(
    service.cambiarEstado(5, { id_usuario: 10, estado: 'cancelada' }),
    BadRequestException,
  );
});
