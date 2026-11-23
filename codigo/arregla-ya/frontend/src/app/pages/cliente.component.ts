
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

    // Conexion con el backend
    api = inject(ApiService);

    // Informacion de la sesion
    auth = inject(AuthService);


    // ======================================
    // 2. PANTALLAS
    // ======================================

    // Buscar, publicar o mis solicitudes
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');


    // ======================================
    // 3. LISTAS DE DATOS
    // ======================================

    // Categorias de servicios
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

    // Solicitud que estamos revisando
    seleccionada = signal<number | null>(null);

    // Mensajes
    error = signal('');
    exito = signal('');

    // Control del boton publicar
    guardando = signal(false);

    // Control del boton cancelar
    cancelando = signal(false);


    // ======================================
    // 5. FILTROS DE BUSQUEDA
    // ======================================

    filtroCategoria = 0;

    filtroZona = '';


    // ======================================
    // 6. FORMULARIO DE SOLICITUD
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
    // 7. INICIAR LA PANTALLA
    // ======================================

    async ngOnInit() {

        try {

            // Obtener categorias
            const lista = await this.api.categorias();

            this.categorias.set(lista);

            // Buscar trabajadores
            await this.buscar();

        } catch (e) {

            this.error.set(mensajeError(e));
        }
    }


    // ======================================
    // 8. BUSCAR TRABAJADORES
    // ======================================

    async buscar() {

        // Limpiar errores
        this.error.set('');

        try {

            // Enviar filtros al backend
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona.trim()
            });

            // Guardar resultados
            this.trabajadores.set(lista);

        } catch (e) {

            // Limpiar resultados antiguos
            this.trabajadores.set([]);

            // Mostrar error
            this.error.set(mensajeError(e));
        }
    }


    // ======================================
    // 9. PUBLICAR SOLICITUD
    // ======================================

    async crear() {

        // Evitar enviar dos veces
        if (this.guardando()) {
            return;
        }

        // Limpiar mensajes
        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // 9.1 VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para publicar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // 9.2 VERIFICAR ROL
        // ----------------------------------

        if (
            usuario.rol !== 'CLIENTE' &&
            usuario.rol !== 'EMPRESA'
        ) {

            this.error.set(
                'Solo los clientes y empresas pueden publicar solicitudes.'
            );

            return;
        }


        // ----------------------------------
        // 9.3 LIMPIAR ESPACIOS
        // ----------------------------------

        this.form.titulo = this.form.titulo.trim();

        this.form.descripcion = this.form.descripcion.trim();

        this.form.direccion = this.form.direccion.trim();

        this.form.zona = this.form.zona.trim();

        this.form.disponibilidad =
            this.form.disponibilidad.trim();

        this.form.fotoUrl = this.form.fotoUrl.trim();


        // ----------------------------------
        // 9.4 VALIDAR TITULO
        // ----------------------------------

        if (this.form.titulo.length < 5) {

            this.error.set(
                'El título debe tener al menos 5 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 9.5 VALIDAR DESCRIPCION
        // ----------------------------------

        if (this.form.descripcion.length < 15) {

            this.error.set(
                'La descripción debe tener al menos 15 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 9.6 VALIDAR CATEGORIA
        // ----------------------------------

        if (this.form.categoriaId <= 0) {

            this.error.set(
                'Debes seleccionar una categoría.'
            );

            return;
        }


        // ----------------------------------
        // 9.7 VALIDAR ZONA
        // ----------------------------------

        if (this.form.zona === '') {

            this.error.set(
                'Debes ingresar la zona del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 9.8 VALIDAR DIRECCION
        // ----------------------------------

        if (this.form.direccion === '') {

            this.error.set(
                'Debes ingresar la dirección del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 9.9 VALIDAR DISPONIBILIDAD
        // ----------------------------------

        if (this.form.disponibilidad === '') {

            this.error.set(
                'Debes indicar tu disponibilidad.'
            );

            return;
        }


        // ----------------------------------
        // 9.10 GUARDAR SOLICITUD
        // ----------------------------------

        this.guardando.set(true);

        try {

            // Enviar solicitud al backend
            const respuesta = await this.api.crearSolicitud(
                this.form
            );

            // Mostrar mensaje de exito
            this.exito.set(
                `Solicitud #${respuesta.id} creada correctamente`
            );


            // ----------------------------------
            // 9.11 LIMPIAR FORMULARIO
            // ----------------------------------

            this.form = {
                titulo: '',
                descripcion: '',
                direccion: '',
                zona: '',
                disponibilidad: '',
                categoriaId: 0,
                fotoUrl: ''
            };


            // ----------------------------------
            // 9.12 ABRIR MIS SOLICITUDES
            // ----------------------------------

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

        // Cambiar a mis solicitudes
        this.vista.set('mias');

        // Limpiar errores
        this.error.set('');


        // ----------------------------------
        // 10.1 VERIFICAR SESION
        // ----------------------------------

        if (!this.auth.usuario()) {

            this.mias.set([]);

            this.error.set(
                'Debes iniciar sesión para ver tus solicitudes.'
            );

            return;
        }


        // ----------------------------------
        // 10.2 CONSULTAR SOLICITUDES
        // ----------------------------------

        try {

            const lista = await this.api.misSolicitudes();

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

        // Limpiar errores
        this.error.set('');


        // ----------------------------------
        // 11.1 CERRAR PROPUESTAS
        // ----------------------------------

        if (this.seleccionada() === id) {

            this.seleccionada.set(null);

            this.ofertas.set([]);

            return;
        }


        // ----------------------------------
        // 11.2 CONSULTAR PROPUESTAS
        // ----------------------------------

        try {

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

        // Limpiar mensajes
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
    // NUEVA FUNCION
    // ======================================

    async cancelar(solicitud: Solicitud) {

        // Evitar dos cancelaciones al mismo tiempo
        if (this.cancelando()) {
            return;
        }

        // Limpiar mensajes anteriores
        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // 13.1 VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para cancelar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // 13.2 VERIFICAR ROL
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
        // 13.3 VERIFICAR ESTADO
        // ----------------------------------

        // Por ahora solo permitimos cancelar
        // solicitudes con estado ACTIVA

        if (solicitud.estado !== 'ACTIVA') {

            this.error.set(
                'Esta solicitud no se puede cancelar.'
            );

            return;
        }


        // ----------------------------------
        // 13.4 PEDIR CONFIRMACION
        // ----------------------------------

        const confirmado = window.confirm(
            '¿Estás seguro de cancelar esta solicitud?'
        );

        // Si el usuario dice que no, salir
        if (!confirmado) {
            return;
        }


        // ----------------------------------
        // 13.5 ENVIAR CANCELACION
        // ----------------------------------

        this.cancelando.set(true);

        try {

            // Solicitar cancelacion al backend
            await this.api.cancelarSolicitud(solicitud.id);

            // Solo mostramos exito si el servidor
            // acepto la cancelacion
            this.exito.set(
                'La solicitud fue cancelada correctamente.'
            );


            // ----------------------------------
            // 13.6 CERRAR PROPUESTAS
            // ----------------------------------

            this.seleccionada.set(null);

            this.ofertas.set([]);


            // ----------------------------------
            // 13.7 ACTUALIZAR SOLICITUDES
            // ----------------------------------

            try {

                // Volver a consultar los datos reales
                const lista = await this.api.misSolicitudes();

                this.mias.set(lista);

            } catch (e) {

                // La cancelacion ya fue aceptada,
                // pero no se pudo actualizar la lista
                this.error.set(
                    'La solicitud se canceló, pero no se pudo actualizar la lista. Vuelve a entrar a Mis solicitudes.'
                );

            }

        } catch (e) {

            // Si el backend rechazo la cancelacion
            this.error.set(mensajeError(e));

        } finally {

            // Volver a habilitar el boton
            this.cancelando.set(false);
        }
    }

}
