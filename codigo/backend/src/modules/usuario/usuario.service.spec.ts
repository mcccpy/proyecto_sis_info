import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsuarioService } from './usuario.service';

function crearUsuarioService(usuario: unknown) {
  const usuarioRepository = {
    findById: async () => usuario,
    findByEmailOrTelefono: async () => null,
  };
  return new UsuarioService(usuarioRepository as never, {} as never);
}

test('exige datos de perfil y documentos para registrarse como reparador', async () => {
  const service = crearUsuarioService(null);
  await assert.rejects(
    service.registrarUsuario({
      nombre: 'Ana',
      email: 'ana@example.test',
      telefono: '70000000',
      password: 'secreto123',
      rol_inicial: 'reparador',
    } as never),
    BadRequestException,
  );
});

test('impide agregar un rol que la cuenta ya tiene', async () => {
  const service = crearUsuarioService({
    usuarioRols: [{ rol: { nombre: 'cliente' } }],
  });
  await assert.rejects(
    service.agregarRol(10, { nuevo_rol: 'cliente' }),
    ConflictException,
  );
});
