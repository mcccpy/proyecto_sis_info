import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PropuestaService } from './propuesta.service';

function crearPropuestaService(propuesta: unknown) {
  const propuestaRepository = {
    findById: async () => propuesta,
    aceptarPropuesta: async () => ({ idPropuesta: 1, estado: 'aceptada' }),
  };
  return new PropuestaService(
    propuestaRepository as never,
    {} as never,
    { esAdministrador: async () => false } as never,
  );
}

const propuesta_pendiente = {
  idPropuesta: 1,
  idReparador: 20,
  estado: 'pendiente',
  precioTotal: '125.00',
  trabajo: { idCliente: 10, estadoPublicacion: 'abierto' },
};

test('acepta una propuesta cotizada por el cliente propietario', async () => {
  const service = crearPropuestaService(propuesta_pendiente);
  const resultado = await service.aceptarPropuesta(1, { id_cliente: 10 });
  assert.equal(resultado.estado, 'aceptada');
});

test('rechaza la decisión de un usuario que no es el cliente del trabajo', async () => {
  const service = crearPropuestaService(propuesta_pendiente);
  await assert.rejects(
    service.aceptarPropuesta(1, { id_cliente: 11 }),
    ForbiddenException,
  );
});

test('rechaza aceptar una propuesta sin cotización positiva', async () => {
  const service = crearPropuestaService({
    ...propuesta_pendiente,
    precioTotal: '0.00',
  });
  await assert.rejects(
    service.aceptarPropuesta(1, { id_cliente: 10 }),
    BadRequestException,
  );
});
