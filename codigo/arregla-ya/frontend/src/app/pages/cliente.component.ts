
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
// COMPONENTE PRINCIPAL DEL CLIENTE
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

    // ApiService se comunica con NestJS
    api = inject(ApiService);

    // AuthService controla al usuario
    auth = inject(AuthService);


    // ======================================
    // 2. PANTALLAS PRINCIPALES
    // ======================================

    // Solo una pestaña principal a la vez
    vista = signal<'buscar' | 'publicar' | 'mias'>('buscar');


    // ======================================
    // 3. LISTAS DEL SISTEMA
    // ======================================

    categorias = signal<Categoria[]>([]);
    trabajadores = signal<Trabajador[]>([]);
    mias = signal<Solicitud[]>([]);
    ofertas = signal<Propuesta[]>([]);


    // ======================================
    // 4. PANELES DE LAS SOLICITUDES
    // ======================================

    // Cada variable guarda un ID o null
    // null significa que el panel esta cerrado

    seleccionada = signal<number | null>(null);

    seguimientoSeleccionado = signal<number | null>(null);

    visitaAbierta = signal<number | null>(null);

    presupuestoAbierto = signal<number | null>(null);

    opinionesAbiertas = signal<number | null>(null);


    // ======================================
    // 5. MENSAJES Y BOTONES
    // ======================================

    error = signal('');
    exito = signal('');

    guardando = signal(false);
    cancelando = signal(false);


    // ======================================
    // 6. FILTROS PARA BUSCAR TECNICOS
    // ======================================

    filtroCategoria = 0;
    filtroZona = '';


    // ======================================
    // 7. FORMULARIO DE SOLICITUD
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
    // 8. COORDINACION DE VISITAS
    // ======================================

    fechaPreferida = '';
    horaPreferida = '';
    notaVisita = '';

    // Borrador de visita no enviado
    borradorVisita = signal<{
        solicitudId: number;
        fecha: string;
        hora: string;
        nota: string;
    } | null>(null);


    // ======================================
    // 9. PRESUPUESTOS ADICIONALES
    // ======================================

    // Montos de una simulacion de interfaz
    montoBase = 0;
    montoExtra = 0;
    motivoAumento = '';

    // Borrador del aumento
    borradorAumento = signal<{
        solicitudId: number;
        original: number;
        extra: number;
        motivo: string;
    } | null>(null);

    // Resultado visual de la simulacion
    decisionAumento = signal('');


    // ======================================
    // 10. INFORMACION DEL PAGO
    // ======================================

    // Por ahora contemplamos efectivo
    notaPago = '';

    // No confirma ni registra un pago
    borradorPago = signal<{
        solicitudId: number;
        nota: string;
    } | null>(null);


    // ======================================
    // 11. CALIFICACIONES
    // ======================================

    estrellas = 5;
    comentarioValoracion = '';

    // Borrador de calificacion
    borradorValoracion = signal<{
        solicitudId: number;
        estrellas: number;
        comentario: string;
    } | null>(null);


    // ======================================
    // 12. RECLAMOS
    // ======================================

    tipoReclamo = '';
    descripcionReclamo = '';

    // Borrador de reclamo
    borradorReclamo = signal<{
        solicitudId: number;
        tipo: string;
        descripcion: string;
    } | null>(null);


    // ======================================
    // 13. INICIAR LA PANTALLA
    // ======================================

    async ngOnInit() {

        // Consultar las categorias
        try {

            const lista = await this.api.categorias();

            this.categorias.set(lista);

        } catch (e) {

            this.error.set(mensajeError(e));

        }

        // Buscar trabajadores al iniciar
        await this.buscar();
    }


    // ======================================
    // 14. BUSCAR TRABAJADORES
    // ======================================

    async buscar() {

        // Limpiar errores anteriores
        this.error.set('');

        try {

            // Aplicar los filtros seleccionados
            const lista = await this.api.trabajadores({
                categoria: this.filtroCategoria,
                zona: this.filtroZona.trim()
            });

            // Mostrar los resultados
            this.trabajadores.set(lista);

        } catch (e) {

            // Evitar mostrar resultados antiguos
            this.trabajadores.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 15. PUBLICAR UNA SOLICITUD
    // ======================================

    async crear() {

        // Evitar enviar dos veces
        if (this.guardando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // VERIFICAR INICIO DE SESION
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para publicar una solicitud.'
            );

            return;
        }


        // ----------------------------------
        // VERIFICAR TIPO DE USUARIO
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
        // ENVIAR SOLICITUD AL BACKEND
        // ----------------------------------

        this.guardando.set(true);

        try {

            const respuesta = await this.api.crearSolicitud(
                this.form
            );

            this.exito.set(
                `Solicitud #${respuesta.id} creada correctamente.`
            );


            // Limpiar el formulario
            this.form = {
                titulo: '',
                descripcion: '',
                direccion: '',
                zona: '',
                disponibilidad: '',
                categoriaId: 0,
                fotoUrl: ''
            };


            // Mostrar las solicitudes
            await this.abrirMias();

        } catch (e) {

            this.error.set(mensajeError(e));

        } finally {

            // Habilitar el boton
            this.guardando.set(false);

        }
    }


    // ======================================
    // 16. CONSULTAR MIS SOLICITUDES
    // ======================================

    async abrirMias() {

        // Cambiar de pestaña
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

            // Consultar solicitudes reales
            const lista = await this.api.misSolicitudes();

            this.mias.set(lista);

        } catch (e) {

            this.mias.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 17. VER PROPUESTAS
    // ======================================

    async verPropuestas(id: number) {

        this.error.set('');


        // Cerrar si ya estan abiertas
        if (this.seleccionada() === id) {

            this.seleccionada.set(null);
            this.ofertas.set([]);

            return;
        }

        try {

            // Consultar presupuestos de esta solicitud
            const lista = await this.api.propuestas(id);

            this.ofertas.set(lista);

            this.seleccionada.set(id);

        } catch (e) {

            this.seleccionada.set(null);
            this.ofertas.set([]);

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 18. ACEPTAR UNA PROPUESTA
    // ======================================

    async aceptar(id: number, solicitudId: number) {

        this.error.set('');
        this.exito.set('');

        try {

            // Aceptar mediante NestJS
            await this.api.aceptar(id);

            this.exito.set(
                'Propuesta aceptada correctamente.'
            );


            // Actualizar las solicitudes
            try {

                const solicitudes =
                    await this.api.misSolicitudes();

                this.mias.set(solicitudes);

            } catch (e) {

                this.error.set(
                    'Se aceptó la propuesta, pero no se pudo actualizar la lista.'
                );

            }


            // Actualizar las propuestas
            try {

                const propuestas =
                    await this.api.propuestas(solicitudId);

                this.ofertas.set(propuestas);

            } catch (e) {

                this.error.set(
                    'No se pudieron actualizar las propuestas.'
                );

            }

        } catch (e) {

            this.error.set(mensajeError(e));

        }
    }


    // ======================================
    // 19. CANCELAR UNA SOLICITUD
    // ======================================

    async cancelar(solicitud: Solicitud) {

        if (this.cancelando()) {
            return;
        }

        this.error.set('');
        this.exito.set('');


        // ----------------------------------
        // VERIFICAR SESION Y ROL
        // ----------------------------------

        const usuario = this.auth.usuario();

        if (!usuario) {

            this.error.set(
                'Debes iniciar sesión para cancelar.'
            );

            return;
        }

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

        // Regla provisional hasta confirmar
        // todos los estados con el backend

        if (solicitud.estado !== 'ACTIVA') {

            this.error.set(
                'Esta solicitud no se puede cancelar.'
            );

            return;
        }


        // ----------------------------------
        // PEDIR CONFIRMACION
        // ----------------------------------

        const confirmado = window.confirm(
            '¿Estás seguro de cancelar esta solicitud?'
        );

        if (!confirmado) {
            return;
        }


        // ----------------------------------
        // ENVIAR CANCELACION
        // ----------------------------------

        this.cancelando.set(true);

        try {

            await this.api.cancelarSolicitud(solicitud.id);

            this.exito.set(
                'La solicitud fue cancelada correctamente.'
            );

            // Cerrar las propuestas
            this.seleccionada.set(null);
            this.ofertas.set([]);


            // Consultar el estado actualizado
            try {

                const lista = await this.api.misSolicitudes();

                this.mias.set(lista);

            } catch (e) {

                this.error.set(
                    'Se canceló la solicitud, pero no se pudo actualizar la lista.'
                );

            }

        } catch (e) {

            this.error.set(mensajeError(e));

        } finally {

            this.cancelando.set(false);

        }
    }


    // ======================================
    // 20. VER SEGUIMIENTO
    // ======================================

    verSeguimiento(id: number) {

        // Cerrar el panel abierto
        if (this.seguimientoSeleccionado() === id) {

            this.seguimientoSeleccionado.set(null);

            return;
        }

        // Abrir el panel seleccionado
        this.seguimientoSeleccionado.set(id);
    }


    // ======================================
    // 21. ABRIR COORDINACION DE VISITA
    // ======================================

    abrirCoordinacion(id: number) {

        // Si estaba abierto, cerrarlo
        if (this.visitaAbierta() === id) {

            this.visitaAbierta.set(null);

            return;
        }

        this.visitaAbierta.set(id);

        // Limpiar los campos
        this.fechaPreferida = '';
        this.horaPreferida = '';
        this.notaVisita = '';

        this.borradorVisita.set(null);
    }


    // ======================================
    // 22. PREPARAR BORRADOR DE VISITA
    // ======================================

    prepararVisita(id: number) {

        this.error.set('');


        // Validar fecha
        if (this.fechaPreferida === '') {

            this.error.set(
                'Selecciona una fecha de visita.'
            );

            return;
        }


        // Validar hora
        if (this.horaPreferida === '') {

            this.error.set(
                'Selecciona una hora de visita.'
            );

            return;
        }


        // Guardar solamente en memoria
        this.borradorVisita.set({
            solicitudId: id,
            fecha: this.fechaPreferida,
            hora: this.horaPreferida,
            nota: this.notaVisita.trim()
        });

        // No se envia al backend
    }


    // ======================================
    // 23. ABRIR PRESUPUESTOS Y PAGOS
    // ======================================

    abrirPresupuesto(id: number) {

        // Cerrar si ya esta abierto
        if (this.presupuestoAbierto() === id) {

            this.presupuestoAbierto.set(null);

            return;
        }

        this.presupuestoAbierto.set(id);

        // Limpiar datos de demostracion
        this.montoBase = 0;
        this.montoExtra = 0;
        this.motivoAumento = '';

        this.borradorAumento.set(null);
        this.decisionAumento.set('');

        this.notaPago = '';
        this.borradorPago.set(null);
    }


    // ======================================
    // 24. CALCULAR AUMENTO DE PRESUPUESTO
    // ======================================

    prepararAumento(id: number) {

        this.error.set('');
        this.decisionAumento.set('');


        // Validar presupuesto original
        if (
            !Number.isFinite(this.montoBase) ||
            this.montoBase <= 0
        ) {

            this.error.set(
                'Ingresa un presupuesto original válido.'
            );

            return;
        }


        // Validar aumento
        if (
            !Number.isFinite(this.montoExtra) ||
            this.montoExtra <= 0
        ) {

            this.error.set(
                'El aumento debe ser mayor que cero.'
            );

            return;
        }


        // Validar motivo
        this.motivoAumento =
            this.motivoAumento.trim();

        if (this.motivoAumento === '') {

            this.error.set(
                'Debes indicar el motivo del aumento.'
            );

            return;
        }


        // Guardar solamente una simulacion
        this.borradorAumento.set({
            solicitudId: id,
            original: this.montoBase,
            extra: this.montoExtra,
            motivo: this.motivoAumento
        });
    }


    // ======================================
    // 25. SIMULAR APROBACION O RECHAZO
    // ======================================

    simularDecision(aprobado: boolean) {

        // No se envia ninguna aprobacion real
        if (!this.borradorAumento()) {
            return;
        }

        if (aprobado) {

            this.decisionAumento.set(
                'Aprobación simulada. No se envió al técnico.'
            );

        } else {

            this.decisionAumento.set(
                'Rechazo simulado. No se envió al técnico.'
            );

        }
    }


    // ======================================
    // 26. PREPARAR NOTA DE PAGO
    // ======================================

    prepararPago(id: number) {

        this.error.set('');

        // Nota temporal sobre efectivo
        this.borradorPago.set({
            solicitudId: id,
            nota: this.notaPago.trim()
        });

        // No registra un pago real
    }


    // ======================================
    // 27. ABRIR CALIFICACIONES Y RECLAMOS
    // ======================================

    abrirOpiniones(id: number) {

        // Cerrar si ya esta abierto
        if (this.opinionesAbiertas() === id) {

            this.opinionesAbiertas.set(null);

            return;
        }

        this.opinionesAbiertas.set(id);

        // Limpiar datos anteriores
        this.estrellas = 5;
        this.comentarioValoracion = '';

        this.tipoReclamo = '';
        this.descripcionReclamo = '';

        this.borradorValoracion.set(null);
        this.borradorReclamo.set(null);
    }


    // ======================================
    // 28. PREPARAR CALIFICACION
    // ======================================

    prepararValoracion(id: number) {

        this.error.set('');


        // ----------------------------------
        // VALIDAR CALIFICACION
        // ----------------------------------

        if (
            !Number.isInteger(this.estrellas) ||
            this.estrellas < 1 ||
            this.estrellas > 5
        ) {

            this.error.set(
                'Selecciona de 1 a 5 estrellas.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR COMENTARIO
        // ----------------------------------

        this.comentarioValoracion =
            this.comentarioValoracion.trim();

        if (this.comentarioValoracion.length < 10) {

            this.error.set(
                'El comentario debe tener al menos 10 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // GUARDAR BORRADOR TEMPORAL
        // ----------------------------------

        this.borradorValoracion.set({
            solicitudId: id,
            estrellas: this.estrellas,
            comentario: this.comentarioValoracion
        });

        // En el sistema final, NestJS debera
        // comprobar que el trabajo finalizo
    }


    // ======================================
    // 29. PREPARAR RECLAMO
    // ======================================

    prepararReclamo(id: number) {

        this.error.set('');


        // ----------------------------------
        // VALIDAR TIPO DE RECLAMO
        // ----------------------------------

        if (this.tipoReclamo === '') {

            this.error.set(
                'Selecciona un tipo de reclamo.'
            );

            return;
        }


        // ----------------------------------
        // VALIDAR DESCRIPCION
        // ----------------------------------

        this.descripcionReclamo =
            this.descripcionReclamo.trim();

        if (this.descripcionReclamo.length < 15) {

            this.error.set(
                'El reclamo necesita al menos 15 caracteres.'
            );

            return;
        }


        // ----------------------------------
        // GUARDAR BORRADOR TEMPORAL
        // ----------------------------------

        this.borradorReclamo.set({
            solicitudId: id,
            tipo: this.tipoReclamo,
            descripcion: this.descripcionReclamo
        });

        // No registra reclamos en PostgreSQL
    }


    // ======================================
    // 30. DEVOLUCIONES PARCIALES DE PAGO
    // ======================================

    idPagoDevolucion = 0;
    montoDevolucion = 0;
    motivoDevolucion = '';
    registrandoDevolucion = signal(false);

    resumenDevoluciones = signal<{
        idPago: number;
        estadoPago: string;
        montoOriginal: number;
        totalDevuelto: number;
        saldoResultante: number;
        historial: Array<{
            idDevolucion: number;
            idPago: number;
            monto: number;
            motivo: string;
            creadoEn: string;
        }>;
    } | null>(null);

    async cargarDevoluciones(idPago: number) {
        this.error.set('');
        const idNum = Number(idPago);
        if (!Number.isInteger(idNum) || idNum <= 0) {
            this.error.set('Ingresa un ID de pago válido para consultar el historial.');
            return;
        }

        try {
            const datos = (await this.api.obtenerDevolucionesPago(idNum)) as { idPago: number; estadoPago: string; montoOriginal: number; totalDevuelto: number; saldoResultante: number; historial: Array<{ idDevolucion: number; idPago: number; monto: number; motivo: string; creadoEn: string; }>; };
            this.resumenDevoluciones.set(datos);
        } catch (e) {
            this.resumenDevoluciones.set(null);
            this.error.set(mensajeError(e));
        }
    }

    async registrarDevolucion() {
        if (this.registrandoDevolucion()) {
            return;
        }

        this.error.set('');
        this.exito.set('');

        const idPago = Number(this.idPagoDevolucion);
        const monto = Number(this.montoDevolucion);
        const motivo = this.motivoDevolucion.trim();

        if (!Number.isInteger(idPago) || idPago <= 0) {
            this.error.set('Debes indicar un ID de pago válido.');
            return;
        }

        if (!Number.isFinite(monto) || monto <= 0) {
            this.error.set('El monto de la devolución parcial debe ser mayor que cero.');
            return;
        }

        if (motivo.length < 5) {
            this.error.set('Debes ingresar un motivo justificado de al menos 5 caracteres.');
            return;
        }

        const actual = this.resumenDevoluciones();
        if (actual && actual.idPago === idPago && monto > actual.saldoResultante) {
            this.error.set(
                `El monto (${monto.toFixed(2)} Bs) supera el saldo resultante disponible (${actual.saldoResultante.toFixed(2)} Bs).`
            );
            return;
        }

        this.registrandoDevolucion.set(true);
        try {
            const resp = (await this.api.registrarDevolucionParcial(idPago, {
                monto,
                motivo,
            })) as { idPago: number; estadoPago: string; montoOriginal: number; totalDevuelto: number; saldoResultante: number; historial: Array<{ idDevolucion: number; idPago: number; monto: number; motivo: string; creadoEn: string; }>; };
            this.resumenDevoluciones.set({
                idPago: resp.idPago,
                estadoPago: resp.estadoPago,
                montoOriginal: resp.montoOriginal,
                totalDevuelto: resp.totalDevuelto,
                saldoResultante: resp.saldoResultante,
                historial: resp.historial,
            });
            this.montoDevolucion = 0;
            this.motivoDevolucion = '';
            this.exito.set('Devolución parcial registrada correctamente.');
        } catch (e) {
            this.error.set(mensajeError(e));
        } finally {
            this.registrandoDevolucion.set(false);
        }
    }
}


