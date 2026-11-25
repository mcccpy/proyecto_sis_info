
import {
    Module,
    Controller,
    Get,
    Query
} from '@nestjs/common';


// ==========================================
// 1. COMPROBAR QUE NESTJS FUNCIONA
// ==========================================

@Controller('health')
class HealthController {

    @Get()
    comprobar() {

        return {
            ok: true,
            proyecto: 'ARREGLA YA',
            modo: 'PRUEBA SIN BASE DE DATOS'
        };

    }
}


// ==========================================
// 2. CATEGORIAS DE PRUEBA
// ==========================================

@Controller('catalogo')
class CatalogoController {

    @Get('categorias')
    listar() {

        // Categorias temporales
        return [
            { id: 1, nombre: 'Plomería' },
            { id: 2, nombre: 'Electricidad' },
            { id: 3, nombre: 'Carpintería' },
            { id: 4, nombre: 'Pintura' }
        ];

    }
}


// ==========================================
// 3. TRABAJADORES DE PRUEBA
// ==========================================

@Controller('trabajadores')
class TrabajadoresController {

    @Get()
    listar(
        @Query('categoria') categoria?: string,
        @Query('zona') zona?: string
    ) {

        // Datos ficticios para probar Angular
        const trabajadores = [
            {
                id: 1,
                nombre: 'Joel Torrico',
                categoria: 'Plomería',
                categoriaId: 1,
                zona: 'Centro',
                disponibilidad: 'Lunes a viernes',
                experiencia: '5 años de experiencia'
            },
            {
                id: 2,
                nombre: 'Ana Flores',
                categoria: 'Electricidad',
                categoriaId: 2,
                zona: 'Cala Cala',
                disponibilidad: 'Por las mañanas',
                experiencia: '3 años de experiencia'
            },
            {
                id: 3,
                nombre: 'Luis Rojas',
                categoria: 'Carpintería',
                categoriaId: 3,
                zona: 'Queru Queru',
                disponibilidad: 'Fines de semana',
                experiencia: '4 años de experiencia'
            }
        ];


        // Aplicar filtros de Angular
        return trabajadores.filter(trabajador => {

            // Filtrar por categoria
            if (
                categoria &&
                Number(categoria) > 0 &&
                trabajador.categoriaId !== Number(categoria)
            ) {
                return false;
            }

            // Filtrar por zona
            if (
                zona &&
                !trabajador.zona.toLowerCase()
                    .includes(zona.trim().toLowerCase())
            ) {
                return false;
            }

            return true;

        });

    }
}


// ==========================================
// 4. MODULO DE PRUEBA
// ==========================================

// Este modulo NO utiliza PostgreSQL
// ni importa las entidades de TypeORM

@Module({
    controllers: [
        HealthController,
        CatalogoController,
        TrabajadoresController
    ]
})
export class AppPruebaModule {}
