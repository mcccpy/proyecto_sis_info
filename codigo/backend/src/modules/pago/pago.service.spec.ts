import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { PagoService } from './pago.service';

function crearPagoService(servicio: unknown, pago: unknown = undefined) {
  const pagoRepository = {
    findByIdWithServicioAndPropuesta: async () => pago,
  };
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => servicio,
  };
  return new PagoService(
    pagoRepository as never,
    servicioRepository as never,
    {} as never,
  );
}

test('solo el cliente dueño del trabajo puede declarar un pago', async () => {
  const service = crearPagoService({
    estado: 'programado',
    propuesta: { trabajo: { idCliente: 10 } },
  });
  await assert.rejects(
    service.declararPago({
      id_servicio: 5,
      id_cliente: 11,
      monto: 50,
      metodo: 'qr',
      comprobante_url: 'https://example.test/pago.png',
    }),
    ForbiddenException,
  );
});

test('solo el reparador asignado puede confirmar la recepción del pago', async () => {
  const service = crearPagoService(undefined, {
    estado: 'declarado',
    servicio: { propuesta: { idReparador: 20 } },
  });
  await assert.rejects(
    service.confirmarPago(8, { id_reparador: 21 }),
    ForbiddenException,
  );
});
