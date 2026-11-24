
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

    // Comunicacion con el backend
    api = inject(ApiService);

    // Informacion del usuario
    auth = inject(AuthService);


    // ======================================
    // 2. PANTALLAS
    // ======================================

    // Indica la pestaña seleccionada
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');


    // ======================================
    // 3. LISTAS DE DATOS
    // ======================================

    categorias = signal<Categoria[]>([]);
    trabajadores = signal<Trabajador[]>([]);
    mias = signal<Solicitud[]>([]);
    ofertas = signal<Propuesta[]>([]);


    // ======================================
    // 4. VARIABLES DE CONTROL
    // ======================================

    // Solicitud con las propuestas abiertas
    seleccionada = signal<number | null>(null);

    // Solicitud con el seguimiento abierto
    seguimientoSeleccionado = signal<number | null>(null);

    // Solicitud con el formulario de visita abierto
    visitaAbierta = signal<number | null>(null);

    // Mensajes del sistema
    error = signal('');
    exito = signal('');

    // Evitar operaciones repetidas
    guardando = signal(false);
    cancelando = signal(false);


    // ======================================
    // 5. FILTROS PARA BUSCAR
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
    // 7. FORMULARIO DE VISITA
    // ======================================

    // Datos que propone el cliente
    fechaPreferida = '';
    horaPreferida = '';
    notaVisita = '';

    // Borrador temporal de la visita
    // No se envia a la base de datos
    borradorVisita = signal<{
        solicitudId: number;
        fecha: string;
        hora: string;
        nota: string;
    } | null>(null);


    // ======================================
    // 8. INICIAR COMPONENTE
    // ======================================

    async ngOnInit() {

        try {

            // Obtener categorias del servidor
            const lista = await this.api.categorias();

            this.categorias.set(lista);

            // Buscar trabajadores al iniciar
            await this.buscar();

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 9. BUSCAR TRABAJADORES
    // ======================================

    async buscar() {

        // Limpiar mensajes anteriores
        this.error.set('');

        try {

            // Buscar trabajadores usando los filtros
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona.trim()
            });

            // Guardar los resultados
            this.trabajadores.set(lista);

        } catch (e) {

            this.trabajadores.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 10. PUBLICAR SOLICITUD
    // ======================================

    async crear() {

        // Evitar publicar dos veces
        if (this.guardando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // 10.1 VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para publicar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // 10.2 VERIFICAR ROL
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
        // 10.3 QUITAR ESPACIOS
        // ----------------------------------

        this.form.titulo = this.form.titulo.trim();

        this.form.descripcion = this.form.descripcion.trim();

        this.form.direccion = this.form.direccion.trim();

        this.form.zona = this.form.zona.trim();

        this.form.disponibilidad =
            this.form.disponibilidad.trim();

        this.form.fotoUrl = this.form.fotoUrl.trim();


        // ----------------------------------
        // 10.4 VALIDAR TITULO
        // ----------------------------------

        if (this.form.titulo.length < 5) {

            this.error.set(
                'El título debe tener al menos 5 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 10.5 VALIDAR DESCRIPCION
        // ----------------------------------

        if (this.form.descripcion.length < 15) {

            this.error.set(
                'La descripción debe tener al menos 15 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 10.6 VALIDAR CATEGORIA
        // ----------------------------------

        if (this.form.categoriaId <= 0) {

            this.error.set(
                'Debes seleccionar una categoría.'
            );

            return;
        }


        // ----------------------------------
        // 10.7 VALIDAR ZONA
        // ----------------------------------

        if (this.form.zona === '') {

            this.error.set(
                'Debes ingresar la zona del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 10.8 VALIDAR DIRECCION
        // ----------------------------------

        if (this.form.direccion === '') {

            this.error.set(
                'Debes ingresar la dirección del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 10.9 VALIDAR DISPONIBILIDAD
        // ----------------------------------

        if (this.form.disponibilidad === '') {

            this.error.set(
                'Debes indicar tu disponibilidad.'
            );

            return;
        }


        // ----------------------------------
        // 10.10 GUARDAR SOLICITUD
        // ----------------------------------

        this.guardando.set(true);

        try {

            // Enviar la solicitud al servidor
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


            // Abrir las solicitudes del cliente
            await this.abrirMias();

        } catch (e) {

            this.error.set(mensajeError(e));

        } finally {

            // Volver a habilitar el boton
            this.guardando.set(false);

        }
    }


    // ======================================
    // 11. VER MIS SOLICITUDES
    // ======================================

    async abrirMias() {

        // Cambiar a la pestaña de solicitudes
        this.vista.set('mias');

        this.error.set('');


        // Verificar inicio de sesion
        if (!this.auth.usuario()) {

            this.mias.set([]);

            this.error.set(
                'Debes iniciar sesión para ver tus solicitudes.'
            );

            return;
        }


        try {

            // Obtener solicitudes del cliente
            const lista = await this.api.misSolicitudes();

            this.mias.set(lista);

        } catch (e) {

            this.mias.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 12. VER PROPUESTAS
    // ======================================

    async verPropuestas(id: number) {

        this.error.set('');


        // Si ya estan abiertas, cerrarlas
        if (this.seleccionada() === id) {

            this.seleccionada.set(null);

            this.ofertas.set([]);

            return;
        }


        try {

            // Consultar las propuestas
            const lista = await this.api.propuestas(id);

            this.ofertas.set(lista);

            // Marcar la solicitud seleccionada
            this.seleccionada.set(id);

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 13. ACEPTAR PROPUESTA
    // ======================================

    async aceptar(id: number, solicitudId: number) {

        this.error.set('');
        this.exito.set('');

        try {

            // Aceptar la propuesta
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
    // 14. CANCELAR SOLICITUD
    // ======================================

    async cancelar(solicitud: Solicitud) {

        // Evitar cancelar varias veces
        if (this.cancelando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // 14.1 VERIFICAR USUARIO
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para cancelar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // 14.2 VERIFICAR ROL
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
        // 14.3 VERIFICAR ESTADO
        // ----------------------------------

        if (solicitud.estado !== 'ACTIVA') {

            this.error.set(
                'Esta solicitud no se puede cancelar.'
            );

            return;
        }


        // ----------------------------------
        // 14.4 PEDIR CONFIRMACION
        // ----------------------------------

        const confirmado = window.confirm(
            '¿Estás seguro de cancelar esta solicitud?'
        );

        if (!confirmado) {
            return;
        }


        // ----------------------------------
        // 14.5 ENVIAR CANCELACION
        // ----------------------------------

        this.cancelando.set(true);

        try {

            // Pedir al backend que cancele
            await this.api.cancelarSolicitud(solicitud.id);

            this.exito.set(
                'La solicitud fue cancelada correctamente.'
            );


            // Cerrar las propuestas
            this.seleccionada.set(null);

            this.ofertas.set([]);


            // Actualizar las solicitudes
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
    // 15. VER SEGUIMIENTO
    // ======================================

    verSeguimiento(id: number) {

        this.error.set('');


        // Si ya esta abierto, cerrarlo
        if (this.seguimientoSeleccionado() === id) {

            this.seguimientoSeleccionado.set(null);

            return;
        }


        // Abrir el seguimiento seleccionado
        this.seguimientoSeleccionado.set(id);
    }


    // ======================================
    // 16. ABRIR COORDINACION DE VISITA
    // NUEVA FUNCION
    // ======================================

    abrirCoordinacion(id: number) {

        // Si ya esta abierto, cerrarlo
        if (this.visitaAbierta() === id) {

            this.visitaAbierta.set(null);

            return;
        }


        // Abrir formulario de esta solicitud
        this.visitaAbierta.set(id);


        // Limpiar los campos anteriores
        this.fechaPreferida = '';

        this.horaPreferida = '';

        this.notaVisita = '';

        this.borradorVisita.set(null);
    }


    // ======================================
    // 17. PREPARAR BORRADOR DE VISITA
    // NUEVA FUNCION
    // ======================================

    prepararVisita(id: number) {

        // Limpiar errores anteriores
        this.error.set('');


        // ----------------------------------
        // 17.1 VERIFICAR SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para proponer una visita.'
            );

            return;
        }


        // ----------------------------------
        // 17.2 VERIFICAR ROL
        // ----------------------------------

        if (
            usuario.rol !== 'CLIENTE' &&
            usuario.rol !== 'EMPRESA'
        ) {

            this.error.set(
                'Solo clientes y empresas pueden proponer visitas.'
            );

            return;
        }


        // ----------------------------------
        // 17.3 VALIDAR FECHA
        // ----------------------------------

        if (this.fechaPreferida === '') {

            this.error.set(
                'Selecciona una fecha para la visita.'
            );

            return;
        }


        // ----------------------------------
        // 17.4 VALIDAR HORA
        // ----------------------------------

        if (this.horaPreferida === '') {

            this.error.set(
                'Selecciona una hora para la visita.'
            );

            return;
        }


        // ----------------------------------
        // 17.5 PREPARAR BORRADOR
        // ----------------------------------

        // No envia datos al backend
        // Solamente guarda un borrador temporal
        this.borradorVisita.set({
            solicitudId: id,
            fecha: this.fechaPreferida,
            hora: this.horaPreferida,
            nota: this.notaVisita.trim()
        });

    }

}
