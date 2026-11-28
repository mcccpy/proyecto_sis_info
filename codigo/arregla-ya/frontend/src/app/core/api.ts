
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

export const API_URL = 'http://localhost:3000/api';

// ==========================================
// 2. INTERFACES DEL SISTEMA DE RECOMENDACION
// ==========================================

export interface CriteriosRecomendacion {
    reputacion: {
        promedio: number;
        cantidadCalificaciones: number;
        puntos: number;
    };

    trabajosCompletados: {
        cantidad: number;
        puntos: number;
    };

    categoria: {
        compatible: boolean;
        puntos: number;
    };

    zona: {
        compatible: boolean;
        puntos: number;
    };
}

export interface TrabajadorRecomendado {
    id: number;
    nombre: string;
    categoria: string;
    zona: string;
    disponibilidad: string;
    puntuacion: number;
    criterios: CriteriosRecomendacion;
}

export interface RespuestaRecomendaciones {
    solicitud: {
        id: number;
        titulo: string;
        categoria: string;
        zona: string;
    };

    criteriosUtilizados: {
        reputacion: string;
        trabajosCompletados: string;
        categoria: string;
        zona: string;
    };

    totalTrabajadores: number;
    recomendaciones: TrabajadorRecomendado[];
}

// ==========================================
// 3. INTERCEPTOR PARA ENVIAR EL TOKEN
// ==========================================

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    let token: string | null = null;

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
// 4. MOSTRAR ERRORES
// ==========================================

export function mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
            return 'No se puede contactar con NestJS. Verifica que el backend este encendido en localhost:3000.';
        }

        const mensaje = error.error?.message;

        if (Array.isArray(mensaje)) {
            return mensaje.join(' • ');
        }

        if (typeof mensaje === 'string') {
            return mensaje;
        }

        return `Error ${error.status}`;
    }

    return 'Ocurrió un error inesperado.';
}

// ==========================================
// 5. SERVICIO DE AUTENTICACION
// ==========================================

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private http = inject(HttpClient);

    usuario = signal<Usuario | null>(this.leerUsuario());

    // --------------------------------------
    // 5.1 LEER USUARIO GUARDADO
    // --------------------------------------

    private leerUsuario(): Usuario | null {
        try {
            if (typeof localStorage === 'undefined') {
                return null;
            }

            const datos = localStorage.getItem('ay_usuario');

            if (datos) {
                return JSON.parse(datos) as Usuario;
            }

            return null;
        } catch {
            return null;
        }
    }

    // --------------------------------------
    // 5.2 REGISTRAR USUARIO
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
    // 5.3 INICIAR SESION
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
    // 5.4 GUARDAR SESION
    // --------------------------------------

    private guardar(respuesta: {
        token: string;
        usuario: Usuario;
    }) {
        localStorage.setItem('ay_token', respuesta.token);

        localStorage.setItem(
            'ay_usuario',
            JSON.stringify(respuesta.usuario)
        );

        this.usuario.set(respuesta.usuario);
    }

    // --------------------------------------
    // 5.5 COMPROBAR SESION
    // --------------------------------------

    async comprobar() {
        if (typeof localStorage === 'undefined') {
            return;
        }

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
        } catch {
            this.salir();
        }
    }

    // --------------------------------------
    // 5.6 CERRAR SESION
    // --------------------------------------

    salir() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('ay_token');
            localStorage.removeItem('ay_usuario');
        }

        this.usuario.set(null);
    }
}

// ==========================================
// 6. SERVICIO DE API
// ==========================================

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    private http = inject(HttpClient);

    // --------------------------------------
    // 6.1 OBTENER CATEGORIAS
    // --------------------------------------

    categorias() {
        return firstValueFrom(
            this.http.get<Categoria[]>(
                `${API_URL}/catalogo/categorias`
            )
        );
    }

    // --------------------------------------
    // 6.2 BUSCAR TRABAJADORES
    // --------------------------------------

    trabajadores(filtros: {
        categoria?: number;
        zona?: string;
    } = {}) {
        const params: Record<string, string> = {};

        if (filtros.categoria) {
            params['categoria'] = String(filtros.categoria);
        }

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
    // 6.3 SISTEMA DE RECOMENDACION
    // --------------------------------------

    recomendaciones(solicitudId: number) {
        return firstValueFrom(
            this.http.get<RespuestaRecomendaciones>(
                `${API_URL}/trabajadores/recomendados/${solicitudId}`
            )
        );
    }

    // --------------------------------------
    // 6.4 CREAR SOLICITUD
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
    // 6.5 VER MIS SOLICITUDES
    // --------------------------------------

    misSolicitudes() {
        return firstValueFrom(
            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/mias`
            )
        );
    }

    // --------------------------------------
    // 6.6 VER SOLICITUDES DISPONIBLES
    // --------------------------------------

    disponibles() {
        return firstValueFrom(
            this.http.get<Solicitud[]>(
                `${API_URL}/solicitudes/disponibles`
            )
        );
    }

    // --------------------------------------
    // 6.7 VER PROPUESTAS DE SOLICITUD
    // --------------------------------------

    propuestas(id: number) {
        return firstValueFrom(
            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/solicitud/${id}`
            )
        );
    }

    // --------------------------------------
    // 6.8 ENVIAR PROPUESTA
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
    // 6.9 ACEPTAR UNA PROPUESTA
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
    // 6.10 CANCELAR SOLICITUD
    // --------------------------------------

    cancelarSolicitud(id: number) {
        return firstValueFrom(
            this.http.patch(
                `${API_URL}/solicitudes/${id}/cancelar`,
                {}
            )
        );
    }

    // --------------------------------------
    // 6.11 FINALIZAR SOLICITUD
    // --------------------------------------

    finalizarSolicitud(id: number) {
        return firstValueFrom(
            this.http.patch(
                `${API_URL}/solicitudes/${id}/finalizar`,
                {}
            )
        );
    }

    // --------------------------------------
    // 6.12 REGISTRAR CALIFICACION
    // --------------------------------------

    calificarSolicitud(
        id: number,
        datos: {
            puntuacion: number;
            comentario?: string;
        }
    ) {
        return firstValueFrom(
            this.http.post(
                `${API_URL}/calificaciones/solicitud/${id}`,
                datos
            )
        );
    }

    // ======================================
    // 7. FUNCIONES DEL TRABAJADOR
    // ======================================

    // --------------------------------------
    // 7.1 VER MIS PROPUESTAS
    // --------------------------------------

    misOfertas() {
        return firstValueFrom(
            this.http.get<Propuesta[]>(
                `${API_URL}/propuestas/mias`
            )
        );
    }

    // --------------------------------------
    // 7.2 VER MI PERFIL TECNICO
    // --------------------------------------

    miPerfilTecnico() {
        return firstValueFrom(
            this.http.get<PerfilTrabajador>(
                `${API_URL}/trabajadores/mi-perfil`
            )
        );
    }

    // --------------------------------------
    // 7.3 GUARDAR PERFIL TECNICO
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
    // 8. FUNCIONES DEL ADMINISTRADOR
    // ======================================

    // --------------------------------------
    // 8.1 VER TRABAJADORES PENDIENTES
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
    // 8.2 APROBAR TRABAJADOR
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
