
import {
    Component,
    inject,
    OnInit,
    signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
    ApiService,
    AuthService,
    mensajeError
} from '../core/api';

import {
    Categoria,
    Propuesta,
    Solicitud,
    Trabajador
} from '../core/models';


// ======================================
// COMPONENTE DEL CLIENTE
// ======================================

@Component({
    selector: 'app-cliente',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './cliente.component.html'
})

export class ClienteComponent implements OnInit {


    // ==================================
    // 1. SERVICIOS
    // ==================================

    api = inject(ApiService);

    auth = inject(AuthService);


    // ==================================
    // 2. VARIABLES
    // ==================================

    // Pantalla que se esta mostrando
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');

    // Listas de datos
    categorias = signal<Categoria[]>([]);

    trabajadores = signal<Trabajador[]>([]);

    mias = signal<Solicitud[]>([]);

    ofertas = signal<Propuesta[]>([]);


    // Solicitud seleccionada
    seleccionada = signal<number | null>(null);


    // Mensajes
    error = signal('');

    exito = signal('');


    // Indica si se esta publicando
    guardando = signal(false);


    // Filtros para buscar
    filtroCategoria = 0;

    filtroZona = '';


    // ==================================
    // 3. FORMULARIO DE SOLICITUD
    // ==================================

    form = {
        titulo: '',
        descripcion: '',
        direccion: '',
        zona: '',
        disponibilidad: '',
        categoriaId: 0,
        fotoUrl: ''
    };


    // ==================================
    // 4. INICIAR LA PANTALLA
    // ==================================

    async ngOnInit() {

        try {

            // Obtener las categorias
            const lista = await this.api.categorias();

            this.categorias.set(lista);

            // Buscar trabajadores al iniciar
            await this.buscar();

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ==================================
    // 5. BUSCAR TRABAJADORES
    // ==================================

    async buscar() {

        // Limpiar errores
        this.error.set('');

        try {

            // Buscar usando los filtros
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona
            });

            // Guardar resultados
            this.trabajadores.set(lista);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ==================================
    // 6. PUBLICAR UNA SOLICITUD
    // ==================================

    async crear() {

        // Limpiar mensajes anteriores
        this.error.set('');

        this.exito.set('');

        // Bloquear boton mientras guarda
        this.guardando.set(true);

        try {

            // Verificar inicio de sesion
            if (!this.auth.usuario()) {
                throw new Error('LOGIN');
            }

            // Enviar solicitud al servidor
            const respuesta = await this.api.crearSolicitud(
                this.form
            );

            // Mostrar mensaje de exito
            this.exito.set(
                `Solicitud #${respuesta.id} creada correctamente`
            );


            // Limpiar formulario
            this.form = {
                titulo: '',
                descripcion: '',
                direccion: '',
                zona: '',
                disponibilidad: '',
                categoriaId: 0,
                fotoUrl: ''
            };


            // Abrir la lista de solicitudes
            await this.abrirMias();

        } catch (e) {

            // Si no inicio sesion
            if (e instanceof Error && e.message === 'LOGIN') {

                this.error.set(
                    'Debes iniciar sesión como cliente para publicar.'
                );

            } else {

                // Otros errores
                this.error.set(mensajeError(e));

            }

        } finally {

            // Habilitar nuevamente el boton
            this.guardando.set(false);

        }
    }


    // ==================================
    // 7. VER MIS SOLICITUDES
    // ==================================

    async abrirMias() {

        // Cambiar de pantalla
        this.vista.set('mias');

        // Limpiar errores
        this.error.set('');


        // Verificar sesion
        if (!this.auth.usuario()) {
            return;
        }


        try {

            // Obtener solicitudes del cliente
            const lista = await this.api.misSolicitudes();

            // Guardar las solicitudes
            this.mias.set(lista);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ==================================
    // 8. VER PROPUESTAS
    // ==================================

    async verPropuestas(id: number) {

        this.error.set('');


        // Si ya estaba abierta, cerrarla
        if (this.seleccionada() === id) {

            this.seleccionada.set(null);

            return;
        }


        try {

            // Consultar propuestas
            const lista = await this.api.propuestas(id);

            // Guardar propuestas
            this.ofertas.set(lista);

            // Marcar solicitud seleccionada
            this.seleccionada.set(id);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ==================================
    // 9. ACEPTAR UNA PROPUESTA
    // ==================================

    async aceptar(id: number, solicitudId: number) {

        this.error.set('');

        try {

            // Aceptar propuesta en el backend
            await this.api.aceptar(id);

            // Mostrar mensaje de exito
            this.exito.set(
                'Propuesta aceptada y solicitud asignada'
            );


            // Actualizar las solicitudes
            const listaSolicitudes =
                await this.api.misSolicitudes();

            this.mias.set(listaSolicitudes);


            // Actualizar las propuestas
            const listaPropuestas =
                await this.api.propuestas(solicitudId);

            this.ofertas.set(listaPropuestas);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }

}
