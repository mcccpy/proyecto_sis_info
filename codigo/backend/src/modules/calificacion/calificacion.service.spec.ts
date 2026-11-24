import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CalificacionService } from './calificacion.service';

function crearCalificacionService(servicio: unknown) {
  const servicioRepository = {
    findByIdWithPropuestaAndTrabajo: async () => servicio,
  };
  const calificacionRepository = {
    findByServicioAndEvaluador: async () => null,
    crearCalificacion: async (datos: unknown) => datos,
  };
  const usuarioRepository = { esAdministrador: async () => false };
  return new CalificacionService(
    calificacionRepository as never,
    servicioRepository as never,
    usuarioRepository as never,
  );
}

const calificacion_base = {
  id_servicio: 5,
  id_evaluador: 10,
  id_evaluado: 20,
  puntuacion: 5,
  comentario: 'Buen trabajo',
};

test('solo permite calificar al reparador asignado', async () => {
  const service = crearCalificacionService({
    estado: 'completado',
    propuesta: { idReparador: 21, trabajo: { idCliente: 10 } },
  });
  await assert.rejects(
    service.crearCalificacion(calificacion_base),
    BadRequestException,
  );
});

test('impide que un usuario ajeno al trabajo emita una calificación', async () => {
  const service = crearCalificacionService({
    estado: 'completado',
    propuesta: { idReparador: 20, trabajo: { idCliente: 10 } },
  });
  await assert.rejects(
    service.crearCalificacion({ ...calificacion_base, id_evaluador: 99 }),
    ForbiddenException,
  );
});
