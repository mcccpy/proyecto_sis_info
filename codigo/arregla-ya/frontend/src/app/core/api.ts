
import { inject, Injectable, signal } from '@angular/core';

import {
    HttpClient,
    HttpErrorResponse,
    HttpInterceptorFn
} from '@angular/common/http';

import { firstValueFrom } from 'rxjs';

import {
    Categoria,
    PerfilTrabajador,
    Propuesta,
    Rol,
    Solicitud,
    Trabajador,
    Usuario
} from './models';


// ==========================================
// 1. DIRECCION DEL BACKEND
// ==========================================

// Servidor NestJS
const API_URL = '/api';


// ==========================================
// 2. ENVIAR EL TOKEN
// ==========================================

// Agrega el token a las peticiones HTTP
export const authInterceptor: HttpInterceptorFn = (req, next) => {

    let token = null;

    if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('ay_token');
    }

    if (token) {

        const nuevaPeticion = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        return next(nuevaPeticion);
    }

    return next(req);
};


// ==========================================
// 3. MOSTRAR ERRORES
// ==========================================

export function mensajeError(error: unknown): string {

    if (error instanceof HttpErrorResponse) {

        // El servidor no responde
        if (error.status === 0) {
            return 'No se puede contactar con NestJS. Verifica que el backend este encendido en localhost:3000.';
        }

        const mensaje = error.error?.message;

        // El servidor envia varios mensajes
        if (Array.isArray(mensaje)) {
            return mensaje.join(' • ');
        }

        // El servidor envia un mensaje
        if (typeof mensaje === 'string') {
            return mensaje;
        }

        return `Error ${error.status}`;
    }

    return 'Ocurrió un error inesperado.';
}


// ==========================================
// 4. SERVICIO DE AUTENTICACION
// ==========================================

@Injectable({
    providedIn: 'root'
})

export class AuthService {

    // Conexion HTTP
    private http = inject(HttpClient);

    // Usuario que inicio sesion
    usuario = signal<Usuario | null>(this.leerUsuario());


    // --------------------------------------
    // 4.1 LEER USUARIO GUARDADO
    // --------------------------------------

    private leerUsuario(): Usuario | null {

        try {

            const datos = localStorage.getItem('ay_usuario');

            if (datos) {
                return JSON.parse(datos) as Usuario;
            }

            return null;

        } catch (error) {

            return null;
        }
    }


    // --------------------------------------
    // 4.2 REGISTRAR USUARIO
    // --------------------------------------

    async registro(datos: {
        nombre: string;
        email: string;
        password: string;
        rol: Rol;
    }) {

        const respuesta = await firstValueFrom(

            this.http.post<{
                token: string;
                usuario: Usuario;
            }>(
                `${API_URL}/auth/registro`,
                datos
            )

        );

        this.guardar(respuesta);

        return respuesta;
    }


    // --------------------------------------
    // 4.3 INICIAR SESION
    // --------------------------------------

    async login(datos: {
        email: string;
        password: string;
    }) {

        const respuesta = await firstValueFrom(

            this.http.post<{
                token: string;
                usuario: Usuario;
            }>(
                `${API_URL}/auth/login`,
                datos
            )

        );

        this.guardar(respuesta);

        return respuesta;
    }


    // --------------------------------------
    // 4.4 GUARDAR SESION
    // --------------------------------------

    private guardar(respuesta: {
        token: string;
        usuario: Usuario;
    }) {

        // Guardamos el token
        localStorage.setItem(
            'ay_token',
            respuesta.token
        );

        // Guardamos los datos del usuario
        localStorage.setItem(
            'ay_usuario',
            JSON.stringify(respuesta.usuario)
        );

        // Actualizamos el usuario
        this.usuario.set(respuesta.usuario);
    }


    // --------------------------------------
    // 4.5 COMPROBAR SESION
    // --------------------------------------

    async comprobar() {

        const token = localStorage.getItem('ay_token');

        if (!token) {
            return;
        }

        try {

            const usuario = await firstValueFrom(

                this.http.get<Usuario>(
                    `${API_URL}/auth/perfil`
                )

            );

            this.usuario.set(usuario);

            localStorage.setItem(
                'ay_usuario',
                JSON.stringify(usuario)
            );

        } catch (error) {

            this.salir();
        }
    }


    // --------------------------------------
    // 4.6 CERRAR SESION
    // --------------------------------------

    salir() {

        localStorage.removeItem('ay_token');

        localStorage.removeItem('ay_usuario');

        this.usuario.set(null);
    }
}


// ==========================================
// 5. SERVICIO DE API
// ==========================================

// Contiene las peticiones al backend NestJS

@Injectable({
    providedIn: 'root'
})

export class ApiService {

    private http = inject(HttpClient);


    // ======================================
    // FUNCIONES DEL CLIENTE
    // ======================================


    // --------------------------------------
    // 5.1 OBTENER CATEGORIAS
    // --------------------------------------

    categorias() {

        return firstValueFrom(

            this.http.get<Categoria[]>(
                `${API_URL}/catalogo/categorias`
            )

        );
    }


    // --------------------------------------
    // 5.2 BUSCAR TRABAJADORES
    // --------------------------------------

    trabajadores(filtros: {
        categoria?: number;
        zona?: string;
    } = {}) {

        // Filtros para la busqueda
        let params: Record<string, string> = {};

        // Filtrar por categoria
        if (filtros.categoria) {
            params['categoria'] = String(filtros.categoria);
        }

        // Filtrar por zona
        if (filtros.zona) {
            params['zona'] = filtros.zona;
        }

        return firstValueFrom(

            this.http.get<Trabajador[]>(
                `${API_URL}/trabajadores`,
                { params }
            )

        );
    }


    // --------------------------------------
    // 5.3 CREAR SOLICITUD
    // --------------------------------------

    crearSolicitud(datos: unknown) {

        return firstValueFrom(

            this.http.post<{
                id: number;
                estado: string;
            }>(
                `${API_URL}/solicitudes`,
                datos
            )

        );
    }


    // --------------------------------------
    // 5.4 VER MIS SOLICITUDES
    // --------------------------------------

    misSolicitudes() {

        return firstValueFrom(

            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/mias`
            )

        );
    }


    // --------------------------------------
    // 5.5 VER SOLICITUDES DISPONIBLES
    // --------------------------------------

    disponibles() {

        return firstValueFrom(

            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/disponibles`
            )

        );
    }


    // --------------------------------------
    // 5.6 VER PROPUESTAS DE SOLICITUD
    // --------------------------------------

    propuestas(id: number) {

        return firstValueFrom(

            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/solicitud/${id}`
            )

        );
    }


    // --------------------------------------
    // 5.7 ENVIAR PROPUESTA
    // FUNCION DEL TRABAJADOR
    // --------------------------------------

    ofrecer(id: number, datos: unknown) {

        return firstValueFrom(

            this.http.post(
                `${API_URL}/propuestas/solicitud/${id}`,
                datos
            )

        );
    }


    // --------------------------------------
    // 5.8 ACEPTAR UNA PROPUESTA
    // --------------------------------------

    aceptar(id: number) {

        return firstValueFrom(

            this.http.patch(
                `${API_URL}/propuestas/${id}/aceptar`,
                {}
            )

        );
    }


    // --------------------------------------
    // 5.9 CANCELAR SOLICITUD
    // NUEVA FUNCION
    // --------------------------------------

    cancelarSolicitud(id: number) {

        // Solicita la cancelacion al backend
        // Esta ruta debe ser confirmada
        // por el encargado del backend

        return firstValueFrom(

            this.http.patch(
                `${API_URL}/solicitudes/${id}/cancelar`,
                {}
            )

        );
    }


    // ======================================
    // FUNCIONES DEL TRABAJADOR
    // ======================================


    // --------------------------------------
    // 6.1 VER MIS PROPUESTAS
    // --------------------------------------

    misOfertas() {

        return firstValueFrom(

            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/mias`
            )

        );
    }


    // --------------------------------------
    // 6.2 VER MI PERFIL TECNICO
    // --------------------------------------

    miPerfilTecnico() {

        return firstValueFrom(

            this.http.get<PerfilTrabajador>(
                `${API_URL}/trabajadores/mi-perfil`
            )

        );
    }


    // --------------------------------------
    // 6.3 GUARDAR PERFIL TECNICO
    // --------------------------------------

    guardarPerfil(datos: unknown) {

        return firstValueFrom(

            this.http.patch(
                `${API_URL}/trabajadores/mi-perfil`,
                datos
            )

        );
    }


    // ======================================
    // FUNCIONES DEL ADMINISTRADOR
    // ======================================


    // --------------------------------------
    // 7.1 VER TRABAJADORES PENDIENTES
    // --------------------------------------

    pendientes() {

        return firstValueFrom(

            this.http.get<{
                id: number;
                nombre: string;
                email: string;
                zona: string;
                experiencia: string;
                categoria: string;
            }[]>(
                `${API_URL}/trabajadores/pendientes`
            )

        );
    }


    // --------------------------------------
    // 7.2 APROBAR TRABAJADOR
    // --------------------------------------

    aprobar(id: number) {

        return firstValueFrom(

            this.http.patch(
                `${API_URL}/trabajadores/${id}/aprobar`,
                {}
            )

        );
    }

}
