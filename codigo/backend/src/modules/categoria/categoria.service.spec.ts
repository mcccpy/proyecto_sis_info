import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CategoriaService } from './categoria.service';

function crearCategoriaService(
  es_administrador: boolean,
  existente: unknown = null,
) {
  const categoriaRepository = {
    findByNombre: async () => existente,
    createCategoria: async (nombre: string) => ({ nombre }),
  };
  const usuarioRepository = { esAdministrador: async () => es_administrador };
  return new CategoriaService(
    categoriaRepository as never,
    usuarioRepository as never,
  );
}

test('rechaza crear categorías desde una cuenta que no es administradora', async () => {
  const service = crearCategoriaService(false);
  await assert.rejects(
    service.crearCategoriaAdmin({ id_admin: 10, nombre: 'Plomería' }),
    ForbiddenException,
  );
});

test('normaliza espacios al crear una categoría', async () => {
  const service = crearCategoriaService(true);
  const resultado = await service.crearCategoriaAdmin({
    id_admin: 1,
    nombre: '  Plomería  ',
  });
  assert.equal(resultado.nombre, 'Plomería');
});

test('no crea una categoría con un nombre ya registrado', async () => {
  const service = crearCategoriaService(true, { idCategoria: 3 });
  await assert.rejects(
    service.crearCategoriaAdmin({ id_admin: 1, nombre: 'Plomería' }),
    ConflictException,
  );
});
