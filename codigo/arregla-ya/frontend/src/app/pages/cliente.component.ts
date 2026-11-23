
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

    // Servicio para consultar datos del sistema
    api = inject(ApiService);

    // Servicio para saber quien inicio sesion
    auth = inject(AuthService);


    // ======================================
    // 2. PANTALLAS DEL CLIENTE
    // ======================================

    // Puede mostrar buscar, publicar o mis solicitudes
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');


    // ======================================
    // 3. LISTAS DE DATOS
    // ======================================

    // Categorias de trabajos
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

    // Identifica la solicitud cuyas propuestas vemos
    seleccionada = signal<number | null>(null);

    // Mensajes para el usuario
    error = signal('');
    exito = signal('');

    // Indica si se esta publicando una solicitud
    guardando = signal(false);


    // ======================================
    // 5. FILTROS DE BUSQUEDA
    // ======================================

    // Cero significa todas las categorias
    filtroCategoria = 0;

    // Zona donde buscamos trabajadores
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

            // Pedimos las categorias al servidor
            const lista = await this.api.categorias();

            // Guardamos las categorias obtenidas
            this.categorias.set(lista);

            // Buscamos trabajadores al iniciar
            await this.buscar();

        } catch (e) {

            // Mostramos cualquier error
            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 8. BUSCAR TRABAJADORES
    // ======================================

    async buscar() {

        // Borramos errores anteriores
        this.error.set('');

        try {

            // Pedimos trabajadores segun los filtros
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona.trim()
            });

            // Guardamos los resultados
            this.trabajadores.set(lista);

        } catch (e) {

            // Limpiamos resultados anteriores
            this.trabajadores.set([]);

            // Mostramos el error
            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 9. PUBLICAR UNA SOLICITUD
    // ======================================

    async crear() {

        // Evitamos publicar dos veces
        if (this.guardando()) {
            return;
        }

        // Borramos los mensajes anteriores
        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // 9.1 VERIFICAR INICIO DE SESION
        // ----------------------------------

        // Obtenemos el usuario que inicio sesion
        const usuario = this.auth.usuario();

        // Si no hay usuario, no puede publicar
        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para publicar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // 9.2 VERIFICAR TIPO DE USUARIO
        // ----------------------------------

        // Solo clientes y empresas pueden publicar
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
        // 9.4 VALIDAR EL TITULO
        // ----------------------------------

        if (this.form.titulo.length < 5) {

            this.error.set(
                'El título debe tener al menos 5 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 9.5 VALIDAR LA DESCRIPCION
        // ----------------------------------

        if (this.form.descripcion.length < 15) {

            this.error.set(
                'La descripción debe tener al menos 15 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // 9.6 VALIDAR LA CATEGORIA
        // ----------------------------------

        if (this.form.categoriaId <= 0) {

            this.error.set(
                'Debes seleccionar una categoría.'
            );

            return;
        }


        // ----------------------------------
        // 9.7 VALIDAR LA ZONA
        // ----------------------------------

        if (this.form.zona === '') {

            this.error.set(
                'Debes ingresar la zona del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 9.8 VALIDAR LA DIRECCION
        // ----------------------------------

        if (this.form.direccion === '') {

            this.error.set(
                'Debes ingresar la dirección del trabajo.'
            );

            return;
        }


        // ----------------------------------
        // 9.9 VALIDAR LA DISPONIBILIDAD
        // ----------------------------------

        if (this.form.disponibilidad === '') {

            this.error.set(
                'Debes indicar tu disponibilidad.'
            );

            return;
        }


        // ----------------------------------
        // 9.10 GUARDAR LA SOLICITUD
        // ----------------------------------

        // Desactivamos el boton mientras guardamos
        this.guardando.set(true);

        try {

            // Enviamos los datos al backend
            const respuesta = await this.api.crearSolicitud(
                this.form
            );

            // Mostramos mensaje de exito
            this.exito.set(
                `Solicitud #${respuesta.id} creada correctamente`
            );


            // ----------------------------------
            // 9.11 LIMPIAR EL FORMULARIO
            // ----------------------------------

            // Dejamos los campos vacios para otra solicitud
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
            // 9.12 MOSTRAR MIS SOLICITUDES
            // ----------------------------------

            await this.abrirMias();

        } catch (e) {

            // Si el servidor devuelve un error
            this.error.set(mensajeError(e));

        } finally {

            // Activamos el boton nuevamente
            this.guardando.set(false);

        }
    }


    // ======================================
    // 10. VER MIS SOLICITUDES
    // ======================================

    async abrirMias() {

        // Cambiamos a la pantalla de solicitudes
        this.vista.set('mias');

        // Borramos errores anteriores
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

            // Pedimos las solicitudes del usuario
            const lista = await this.api.misSolicitudes();

            // Guardamos la lista obtenida
            this.mias.set(lista);

        } catch (e) {

            // Mostramos el error
            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 11. VER PROPUESTAS DE UNA SOLICITUD
    // ======================================

    async verPropuestas(id: number) {

        // Limpiamos errores
        this.error.set('');


        // ----------------------------------
        // 11.1 CERRAR PROPUESTAS ABIERTAS
        // ----------------------------------

        // Si ya estamos viendo esa solicitud,
        // cerramos sus propuestas
        if (this.seleccionada() === id) {

            this.seleccionada.set(null);

            this.ofertas.set([]);

            return;
        }


        // ----------------------------------
        // 11.2 CONSULTAR PROPUESTAS
        // ----------------------------------

        try {

            // Pedimos las propuestas de la solicitud
            const lista = await this.api.propuestas(id);

            // Guardamos las propuestas
            this.ofertas.set(lista);

            // Guardamos el ID de la solicitud abierta
            this.seleccionada.set(id);

        } catch (e) {

            // Mostramos el error
            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 12. ACEPTAR UNA PROPUESTA
    // ======================================

    async aceptar(id: number, solicitudId: number) {

        // Limpiamos mensajes
        this.error.set('');
        this.exito.set('');

        try {

            // ----------------------------------
            // 12.1 ACEPTAR PROPUESTA
            // ----------------------------------

            // Enviamos la aceptacion al servidor
            await this.api.aceptar(id);


            // ----------------------------------
            // 12.2 MOSTRAR MENSAJE
            // ----------------------------------

            this.exito.set(
                'Propuesta aceptada y solicitud asignada.'
            );


            // ----------------------------------
            // 12.3 ACTUALIZAR SOLICITUDES
            // ----------------------------------

            // Volvemos a obtener las solicitudes
            const listaSolicitudes =
                await this.api.misSolicitudes();

            this.mias.set(listaSolicitudes);


            // ----------------------------------
            // 12.4 ACTUALIZAR PROPUESTAS
            // ----------------------------------

            // Volvemos a obtener las propuestas
            const listaPropuestas =
                await this.api.propuestas(solicitudId);

            this.ofertas.set(listaPropuestas);

        } catch (e) {

            // Mostramos cualquier error
            this.error.set(mensajeError(e));

        }
    }

}
