
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

// Aqui se encuentra el servidor NestJS
export const API_URL = 'http://localhost:3000/api';


// ==========================================
// 2. ENVIAR EL TOKEN DEL USUARIO
// ==========================================

// Esta funcion agrega el token a las peticiones
export const authInterceptor: HttpInterceptorFn = (req, next) => {

    let token = null;

    // Verificar que exista localStorage
    if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('ay_token');
    }

    // Si existe un token, enviarlo al servidor
    if (token) {

        const nuevaPeticion = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        return next(nuevaPeticion);
    }

    // Si no existe token, enviar normalmente
    return next(req);
};


// ==========================================
// 3. MOSTRAR MENSAJES DE ERROR
// ==========================================

export function mensajeError(error: unknown): string {

    if (error instanceof HttpErrorResponse) {

        // El backend no responde
        if (error.status === 0) {
            return 'No se puede contactar con NestJS. Verifica que el backend este encendido en localhost:3000.';
        }

        const mensaje = error.error?.message;

        // Si el servidor devuelve varios errores
        if (Array.isArray(mensaje)) {
            return mensaje.join(' • ');
        }

        // Si devuelve un solo mensaje
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

// Esta clase controla el registro,
// inicio de sesion y cierre de sesion.

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    // Objeto para comunicarse con el servidor
    private http = inject(HttpClient);

    // Usuario que inicio sesion
    usuario = signal<Usuario | null>(this.leerUsuario());


    // --------------------------------------
    // LEER USUARIO GUARDADO
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
    // REGISTRAR USUARIO
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
    // INICIAR SESION
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
    // GUARDAR DATOS DEL USUARIO
    // --------------------------------------

    private guardar(respuesta: {
        token: string;
        usuario: Usuario;
    }) {

        localStorage.setItem(
            'ay_token',
            respuesta.token
        );

        localStorage.setItem(
            'ay_usuario',
            JSON.stringify(respuesta.usuario)
        );

        this.usuario.set(respuesta.usuario);
    }


    // --------------------------------------
    // COMPROBAR SESION
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
    // CERRAR SESION
    // --------------------------------------

    salir() {

        localStorage.removeItem('ay_token');

        localStorage.removeItem('ay_usuario');

        this.usuario.set(null);
    }
}


// ==========================================
// 5. SERVICIO DE LA API
// ==========================================

// Esta clase contiene los metodos para
// comunicarse con el backend NestJS.

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    private http = inject(HttpClient);


    // ======================================
    // FUNCIONES DEL CLIENTE
    // ======================================


    // --------------------------------------
    // OBTENER CATEGORIAS
    // --------------------------------------

    categorias() {

        return firstValueFrom(

            this.http.get<Categoria[]>(
                `${API_URL}/catalogo/categorias`
            )

        );
    }


    // --------------------------------------
    // BUSCAR TRABAJADORES
    // --------------------------------------

    trabajadores(filtros: {
        categoria?: number;
        zona?: string;
    } = {}) {

        let params: Record<string, string> = {};

        // Filtrar por categoria
        if (filtros.categoria) {

            params['categoria'] = String(filtros.categoria);
        }

        // Filtrar por zona
        if (filtros.zona) {

            params['zona'] = filtros.zona;
        }

        // Obtener los trabajadores
        return firstValueFrom(

            this.http.get<Trabajador[]>(
                `${API_URL}/trabajadores`,
                { params }
            )

        );
    }


    // --------------------------------------
    // CREAR UNA SOLICITUD
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
    // VER MIS SOLICITUDES
    // --------------------------------------

    misSolicitudes() {

        return firstValueFrom(

            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/mias`
            )

        );
    }


    // --------------------------------------
    // VER SOLICITUDES DISPONIBLES
    // --------------------------------------

    disponibles() {

        return firstValueFrom(

            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/disponibles`
            )

        );
    }


    // --------------------------------------
    // VER PROPUESTAS DE UNA SOLICITUD
    // --------------------------------------

    propuestas(id: number) {

        return firstValueFrom(

            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/solicitud/${id}`
            )

        );
    }


    // --------------------------------------
    // ENVIAR PROPUESTA COMO TRABAJADOR
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
    // ACEPTAR UNA PROPUESTA
    // --------------------------------------

    aceptar(id: number) {

        return firstValueFrom(

            this.http.patch(
                `${API_URL}/propuestas/${id}/aceptar`,
                {}
            )

        );
    }


    // ======================================
    // FUNCIONES DEL TRABAJADOR
    // ======================================


    // --------------------------------------
    // VER MIS PROPUESTAS
    // --------------------------------------

    misOfertas() {

        return firstValueFrom(

            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/mias`
            )

        );
    }


    // --------------------------------------
    // VER MI PERFIL TECNICO
    // --------------------------------------

    miPerfilTecnico() {

        return firstValueFrom(

            this.http.get<PerfilTrabajador>(
                `${API_URL}/trabajadores/mi-perfil`
            )

        );
    }


    // --------------------------------------
    // GUARDAR PERFIL TECNICO
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
    // VER TRABAJADORES PENDIENTES
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
    // APROBAR TRABAJADOR
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
