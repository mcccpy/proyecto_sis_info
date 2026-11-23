import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const PUERTO_HTTP = 3000;

/** Crea la aplicación Nest y deja la API escuchando en el puerto configurado. */
async function iniciarServidor(): Promise<void> {
  const aplicacion = await NestFactory.create(AppModule);
  aplicacion.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await aplicacion.listen(PUERTO_HTTP);
  console.log(
    `Servidor NestJS + Prisma 8 corriendo en http://localhost:${PUERTO_HTTP}`,
  );
}

void iniciarServidor().catch((error: unknown) => {
  console.error('No se pudo iniciar la aplicación NestJS.', error);
  process.exitCode = 1;
});
