import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('CAMBIAR')) {
    throw new Error('Configura JWT_SECRET con 32 caracteres o más en backend/.env');
  }
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:4200').split(','), methods: ['GET','POST','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`ARREGLA YA API: http://localhost:${port}/api/health`);
}
bootstrap().catch(error => { console.error(error); process.exit(1); });
