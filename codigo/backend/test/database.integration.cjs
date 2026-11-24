const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { db } = require('../dist/prisma/db.js');

const habilitadas = process.env.RUN_DB_INTEGRATION === '1';

test(
  'PostgreSQL: insertar, consultar, validar unicidad y eliminar una categoría de prueba',
  { skip: !habilitadas },
  async () => {
    const nombre = `__test_integracion_${randomUUID()}`;
    const categorias = db.orm.public.Categoria;
    let idCategoria;

    try {
      const creada = await categorias.create({ nombre });
      idCategoria = creada.idCategoria;

      const encontrada = await categorias
        .where({ idCategoria })
        .first();
      assert.equal(encontrada?.nombre, nombre);

      await assert.rejects(() => categorias.create({ nombre }));
    } finally {
      try {
        if (idCategoria !== undefined) {
          await categorias.where({ idCategoria }).delete();
        }
      } finally {
        await db.close();
      }
    }
  },
);
