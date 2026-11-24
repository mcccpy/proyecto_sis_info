import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ServicioService } from './servicio.service';

const servicio_base = {
  estado: 'programado',
  propuesta: {
    idPropuesta: 7,
    idReparador: 20,
    trabajo: { idTrabajo: 3, idCliente: 10 },
  },
  pagos: [],
};

function crearServicioService(
  servicio: unknown = servicio_base,
  usuario_admin = false,
) {
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => servicio,
    findByIdWithPropuestaAndPagos: async () => servicio,
    completarServicio: async () => ({ idServicio: 5, estado: 'completado' }),
  };
  const usuarioRepository = {
    esAdministrador: async () => usuario_admin,
  };
  return new ServicioService(
    servicioRepository as never,
    usuarioRepository as never,
  );
}

test('no completa el servicio si no hay pago confirmado o aprobado', async () => {
  const servicio = { ...servicio_base, pagos: [{ estado: 'declarado' }] };
  const service = crearServicioService(servicio);
  await assert.rejects(service.completarServicio(5, 20), BadRequestException);
});

test('permite completar el servicio cuando existe un pago confirmado', async () => {
  const servicio = { ...servicio_base, pagos: [{ estado: 'confirmado' }] };
  const service = crearServicioService(servicio);
  const result = await service.completarServicio(5, 20);
  assert.equal(result.estado, 'completado');
});

test('solo el reparador asignado puede completar el servicio', async () => {
  const servicio = { ...servicio_base, pagos: [{ estado: 'aprobado' }] };
  const service = crearServicioService(servicio);
  await assert.rejects(service.completarServicio(5, 21), ForbiddenException);
});

test('rechaza ajustes solicitados por usuarios que no participan', async () => {
  const service = crearServicioService();
  await assert.rejects(
    service.registrarAjustePresupuesto(5, {
      id_solicitante: 99,
      monto_anterior: 100,
      monto_nuevo: 120,
      motivo: 'Material adicional',
    } as never),
    ForbiddenException,
  );
});

test('solo el reparador puede solicitar una disminución del presupuesto', async () => {
  const service = crearServicioService();
  await assert.rejects(
    service.registrarAjustePresupuesto(5, {
      id_solicitante: 10,
      monto_anterior: 100,
      monto_nuevo: 80,
      motivo: 'Menos materiales',
    } as never),
    ForbiddenException,
  );
});

test('el reparador solicita la cancelación y espera decisión administrativa', async () => {
  let servicio_cancelado = false;
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => servicio_base,
    findSolicitudCancelacionReparador: async () => null,
    crearSolicitudCancelacionReparador: async () => ({ idReclamo: 8 }),
    cancelarServicio: async () => {
      servicio_cancelado = true;
      return { estado: 'cancelado' };
    },
  };
  const service = new ServicioService(
    servicioRepository as never,
    {} as never,
  );
  const result = await service.cancelarServicio(5, {
    id_usuario: 20,
    motivo: 'No puedo completar el trabajo.',
  });
  assert.equal(result.estado, 'pendiente_aprobacion');
  assert.equal(result.reclamo.idReclamo, 8);
  assert.equal(servicio_cancelado, false);
});
