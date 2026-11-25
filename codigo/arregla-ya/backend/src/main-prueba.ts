
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppPruebaModule } from './app-prueba.module';


// ==========================================
// INICIAR BACKEND DE PRUEBA
// SIN POSTGRESQL
// ==========================================

async function iniciar() {

    // Crear la aplicacion NestJS
    const app = await NestFactory.create(
        AppPruebaModule
    );

    // Todas las rutas empiezan con /api
    app.setGlobalPrefix('api');

    // Iniciar en el puerto 3000
    await app.listen(3000, '127.0.0.1');

    console.log(
        'Backend de prueba iniciado correctamente'
    );

    console.log(
        'http://localhost:3000/api/health'
    );

}

iniciar();
