import assert from 'node:assert/strict';
import test from 'node:test';
import { TrabajoService } from './trabajo.service';

function crearTrabajoService(perfiles: unknown[]) {
  const perfilTrabajadorRepository = {
    findReparadoresAprobadosParaBusqueda: async () => perfiles,
  };
  return new TrabajoService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    perfilTrabajadorRepository as never,
  );
}

function crearPerfil(id_usuario: number, desplazamiento_latitud: number) {
  return {
    idUsuario: id_usuario,
    usuario: { nombre: `Técnico ${id_usuario}`, telefono: '70000000' },
    zonaReparadors: [
      {
        etiqueta: `Zona ${id_usuario}`,
        latitud: desplazamiento_latitud,
        longitud: 0,
        radioGood: 1000,
        radioMedio: 5000,
        radioBad: 10000,
      },
    ],
    categoriaReparadors: [{ categoria: { nombre: 'Plomería' } }],
  };
}

test('ordena técnicos por anillo de cobertura y luego por distancia', async () => {
  const service = crearTrabajoService([
    crearPerfil(30, 0.06), // anillo rojo
    crearPerfil(20, 0.03), // anillo amarillo
    crearPerfil(10, 0.005), // anillo verde
  ]);
  const resultados = await service.buscarTecnicosDirectos({
    id_categoria: 1,
    latitud: 0,
    longitud: 0,
  } as never);
  assert.deepEqual(
    resultados.map((tecnico) => tecnico.id_reparador),
    [10, 20, 30],
  );
  assert.deepEqual(
    resultados.map((tecnico) => tecnico.anillo_cobertura),
    ['VERDE', 'AMARILLO', 'ROJO'],
  );
});

test('no incluye perfiles sin usuario asociado', async () => {
  const service = crearTrabajoService([
    { ...crearPerfil(10, 0.001), usuario: null },
  ]);
  const resultados = await service.buscarTecnicosDirectos({
    id_categoria: 1,
    latitud: 0,
    longitud: 0,
  } as never);
  assert.equal(resultados.length, 0);
});
