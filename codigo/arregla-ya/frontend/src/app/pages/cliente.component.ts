
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


// ==========================================
// COMPONENTE DEL CLIENTE
// ==========================================

@Component({
    selector: 'app-cliente',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './cliente.component.html'
})

export class ClienteComponent implements OnInit {


    // ======================================
    // 1. SERVICIOS
    // ======================================

    // Servicio para comunicarse con NestJS
    api = inject(ApiService);

    // Servicio para conocer al usuario
    auth = inject(AuthService);


    // ======================================
    // 2. PANTALLAS
    // ======================================

    // Indica que pestaña esta abierta
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');


    // ======================================
    // 3. LISTAS
    // ======================================

    // Categorias disponibles
    categorias = signal<Categoria[]>([]);

    // Trabajadores encontrados
    trabajadores = signal<Trabajador[]>([]);

    // Solicitudes del cliente
    mias = signal<Solicitud[]>([]);

    // Propuestas recibidas
    ofertas = signal<Propuesta[]>([]);


    // ======================================
    // 4. VARIABLES DE CONTROL
    // ======================================

    // ID de la solicitud cuyas propuestas vemos
    seleccionada = signal<number | null>(null);

    // NUEVO: ID de la solicitud cuyo seguimiento vemos
    seguimientoSeleccionado = signal<number | null>(null);

    // Mensajes
    error = signal('');
    exito = signal('');

    // Control de botones
    guardando = signal(false);
    cancelando = signal(false);


    // ======================================
    // 5. FILTROS
    // ======================================

    filtroCategoria = 0;

    filtroZona = '';


    // ======================================
    // 6. FORMULARIO
    // ======================================

    form = {
        titulo: '',
        descripcion: '',
        direccion: '',
        zona: '',
        disponibilidad: '',
        categoriaId: 0,
        fotoUrl: ''
    };


    // ======================================
    // 7. INICIAR COMPONENTE
    // ======================================

    async ngOnInit() {

        try {

            // Obtener las categorias
            const lista = await this.api.categorias();

            this.categorias.set(lista);

            // Buscar los trabajadores
            await this.buscar();

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 8. BUSCAR TRABAJADORES
    // ======================================

    async buscar() {

        this.error.set('');

        try {

            // Buscar segun categoria y zona
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona.trim()
            });

            this.trabajadores.set(lista);

        } catch (e) {

            this.trabajadores.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 9. PUBLICAR SOLICITUD
    // ======================================

    async crear() {

        // Evitar publicar dos veces
        if (this.guardando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para publicar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // VERIFICAR ROL
        // ----------------------------------

        if (
            usuario.rol !== 'CLIENTE' &&
            usuario.rol !== 'EMPRESA'
        ) {

            this.error.set(
                'Solo clientes y empresas pueden publicar solicitudes.'
            );

            return;
        }


        // ----------------------------------
        // LIMPIAR ESPACIOS
        // ----------------------------------

        this.form.titulo = this.form.titulo.trim();

        this.form.descripcion = this.form.descripcion.trim();

        this.form.direccion = this.form.direccion.trim();

        this.form.zona = this.form.zona.trim();

        this.form.disponibilidad =
            this.form.disponibilidad.trim();

        this.form.fotoUrl = this.form.fotoUrl.trim();


        // ----------------------------------
        // VALIDAR TITULO
        // ----------------------------------

        if (this.form.titulo.length < 5) {

            this.error.set(
                'El título debe tener al menos 5 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR DESCRIPCION
        // ----------------------------------

        if (this.form.descripcion.length < 15) {

            this.error.set(
                'La descripción debe tener al menos 15 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR CATEGORIA
        // ----------------------------------

        if (this.form.categoriaId <= 0) {

            this.error.set(
                'Debes seleccionar una categoría.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR ZONA
        // ----------------------------------

        if (this.form.zona === '') {

            this.error.set(
                'Debes ingresar la zona del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR DIRECCION
        // ----------------------------------

        if (this.form.direccion === '') {

            this.error.set(
                'Debes ingresar la dirección del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR DISPONIBILIDAD
        // ----------------------------------

        if (this.form.disponibilidad === '') {

            this.error.set(
                'Debes indicar tu disponibilidad.'
            );

            return;
        }


        // ----------------------------------
        // ENVIAR SOLICITUD
        // ----------------------------------

        this.guardando.set(true);

        try {

            const respuesta = await this.api.crearSolicitud(
                this.form
            );

            // Mostrar el resultado
            this.exito.set(
                `Solicitud #${respuesta.id} creada correctamente`
            );


            // Limpiar los campos
            this.form = {
                titulo: '',
                descripcion: '',
                direccion: '',
                zona: '',
                disponibilidad: '',
                categoriaId: 0,
                fotoUrl: ''
            };


            // Abrir mis solicitudes
            await this.abrirMias();

        } catch (e) {

            this.error.set(mensajeError(e));

        } finally {

            this.guardando.set(false);

        }
    }


    // ======================================
    // 10. VER MIS SOLICITUDES
    // ======================================

    async abrirMias() {

        // Cambiar de pestaña
        this.vista.set('mias');

        // Limpiar mensajes de error
        this.error.set('');


        // Verificar usuario
        if (!this.auth.usuario()) {

            this.mias.set([]);

            this.error.set(
                'Debes iniciar sesión para ver tus solicitudes.'
            );

            return;
        }


        try {

            // Consultar solicitudes
            const lista = await this.api.misSolicitudes();

            // Guardar resultados
            this.mias.set(lista);

        } catch (e) {

            this.mias.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 11. VER PROPUESTAS
    // ======================================

    async verPropuestas(id: number) {

        this.error.set('');


        // Si estan abiertas, cerrarlas
        if (this.seleccionada() === id) {

            this.seleccionada.set(null);

            this.ofertas.set([]);

            return;
        }


        try {

            // Obtener propuestas
            const lista = await this.api.propuestas(id);

            this.ofertas.set(lista);

            this.seleccionada.set(id);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 12. ACEPTAR PROPUESTA
    // ======================================

    async aceptar(id: number, solicitudId: number) {

        this.error.set('');
        this.exito.set('');

        try {

            // Aceptar propuesta
            await this.api.aceptar(id);

            this.exito.set(
                'Propuesta aceptada y solicitud asignada.'
            );


            // Actualizar solicitudes
            const listaSolicitudes =
                await this.api.misSolicitudes();

            this.mias.set(listaSolicitudes);


            // Actualizar propuestas
            const listaPropuestas =
                await this.api.propuestas(solicitudId);

            this.ofertas.set(listaPropuestas);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 13. CANCELAR SOLICITUD
    // ======================================

    async cancelar(solicitud: Solicitud) {

        // Evitar cancelar varias veces
        if (this.cancelando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para cancelar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // VERIFICAR ROL
        // ----------------------------------

        if (
            usuario.rol !== 'CLIENTE' &&
            usuario.rol !== 'EMPRESA'
        ) {

            this.error.set(
                'No tienes permiso para cancelar solicitudes.'
            );

            return;
        }


        // ----------------------------------
        // VERIFICAR ESTADO
        // ----------------------------------

        if (solicitud.estado !== 'ACTIVA') {

            this.error.set(
                'Esta solicitud no se puede cancelar.'
            );

            return;
        }


        // ----------------------------------
        // CONFIRMAR CANCELACION
        // ----------------------------------

        const confirmado = window.confirm(
            '¿Estás seguro de cancelar esta solicitud?'
        );

        if (!confirmado) {
            return;
        }


        // ----------------------------------
        // SOLICITAR CANCELACION
        // ----------------------------------

        this.cancelando.set(true);

        try {

            // Enviar peticion a NestJS
            await this.api.cancelarSolicitud(solicitud.id);

            this.exito.set(
                'La solicitud fue cancelada correctamente.'
            );


            // Cerrar propuestas abiertas
            this.seleccionada.set(null);

            this.ofertas.set([]);


            // Actualizar solicitudes
            try {

                const lista = await this.api.misSolicitudes();

                this.mias.set(lista);

            } catch (e) {

                this.error.set(
                    'La solicitud se canceló, pero no se pudo actualizar la lista.'
                );

            }

        } catch (e) {

            this.error.set(mensajeError(e));

        } finally {

            this.cancelando.set(false);

        }
    }


    // ======================================
    // 14. VER SEGUIMIENTO DEL SERVICIO
    // NUEVA FUNCION
    // ======================================

    verSeguimiento(id: number) {

        // Limpiar mensajes anteriores
        this.error.set('');


        // ----------------------------------
        // SI YA ESTA ABIERTO, CERRARLO
        // ----------------------------------

        if (this.seguimientoSeleccionado() === id) {

            this.seguimientoSeleccionado.set(null);

            return;
        }


        // ----------------------------------
        // MOSTRAR SEGUIMIENTO
        // ----------------------------------

        // Guardar el ID de la solicitud
        // para mostrar sus detalles

        this.seguimientoSeleccionado.set(id);

    }

}
