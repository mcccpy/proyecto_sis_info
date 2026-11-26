
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
                return this.normalizarUsuario(JSON.parse(datos) as Usuario);
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
        telefono: string;
        rol: Rol;
        perfil_reparador?: unknown;
        documentos?: unknown;
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

        const usuario = this.normalizarUsuario(respuesta.usuario);
        localStorage.setItem('ay_token', respuesta.token);
        localStorage.setItem('ay_usuario', JSON.stringify(usuario));
        this.usuario.set(usuario);
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

            const normalizado = this.normalizarUsuario(usuario);
            this.usuario.set(normalizado);
            localStorage.setItem('ay_usuario', JSON.stringify(normalizado));

        } catch (error) {

            this.salir();
        }
    }


    private normalizarUsuario(raw: unknown): Usuario {
        const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const id = Number(obj['id'] ?? obj['id_usuario'] ?? obj['idUsuario'] ?? 0);
        const rol = String(obj['rol'] ?? '').toUpperCase();
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error('La API no devolvio un ID de usuario valido.');
        }
        return {
            id,
            nombre: String(obj['nombre'] ?? ''),
            email: String(obj['email'] ?? ''),
            rol: (rol === 'TRABAJADOR' || rol === 'ADMIN' || rol === 'EMPRESA'
                ? rol : 'CLIENTE') as Rol,
        };
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


function injectarUsuarioDesdeStorage(): number {
    try {
        const guardado = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
        return Number(guardado.id || 0);
    } catch { return 0; }
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

    async categorias(): Promise<Categoria[]> {
        const raw = await firstValueFrom(
            this.http.get<unknown>(`${API_URL}/catalogo/categorias`)
        );
        const lista = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as { value?: unknown[] })?.value)
                ? (raw as { value: unknown[] }).value
                : [];
        return lista.map((item) => {
            const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            const idNum = Number(obj['id'] ?? obj['idCategoria'] ?? obj['id_categoria'] ?? 0) || 0;
            return {
                ...obj,
                id: idNum,
                nombre: String(obj['nombre'] ?? ''),
            } as Categoria;
        });
    }


    // --------------------------------------
    // 5.2 BUSCAR TRABAJADORES
    // --------------------------------------

    trabajadores(filtros: {
        categoria?: number;
        zona?: string;
    } = {}): Promise<Trabajador[]> {
        const params: Record<string, string> = {};
        if (filtros.categoria) {
            params['categoria'] = String(filtros.categoria);
        }
        if (filtros.zona) {
            params['zona'] = filtros.zona;
        }

        return firstValueFrom(
            this.http.get<unknown>(`${API_URL}/trabajadores`, { params })
        ).then((raw) => {
            const lista = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as { value?: unknown[] })?.value)
                    ? (raw as { value: unknown[] }).value
                    : [];

            const normalizados = lista.map((item) => {
                const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
                const usuario = (obj['usuario'] && typeof obj['usuario'] === 'object'
                    ? obj['usuario']
                    : {}) as Record<string, unknown>;

                const catsRel = Array.isArray(obj['categoriaReparadors'])
                    ? (obj['categoriaReparadors'] as Array<Record<string, unknown>>)
                    : [];
                const nombresCats = catsRel
                    .map((cr) => {
                        const cObj = (cr['categoria'] && typeof cr['categoria'] === 'object'
                            ? cr['categoria']
                            : {}) as Record<string, unknown>;
                        return String(cObj['nombre'] ?? cr['nombre'] ?? '').trim();
                    })
                    .filter(Boolean);
                const idsCats = catsRel
                    .map((cr) => {
                        const cObj = (cr['categoria'] && typeof cr['categoria'] === 'object'
                            ? cr['categoria']
                            : {}) as Record<string, unknown>;
                        return Number(cr['idCategoria'] ?? cObj['id'] ?? cObj['idCategoria'] ?? 0) || 0;
                    })
                    .filter((n) => n > 0);

                const zonasRel = Array.isArray(obj['zonaReparadors'])
                    ? (obj['zonaReparadors'] as Array<Record<string, unknown>>)
                    : [];
                const nombresZonas = zonasRel
                    .map((zr) => String(zr['etiqueta'] ?? zr['zona'] ?? '').trim())
                    .filter(Boolean);

                const dispRel = Array.isArray(obj['disponibilidads'])
                    ? (obj['disponibilidads'] as Array<Record<string, unknown>>)
                    : [];
                const textoDisp = dispRel
                    .map((dr) => {
                        const hIni = String(dr['horaInicio'] ?? dr['hora_inicio'] ?? '').trim();
                        const hFin = String(dr['horaFin'] ?? dr['hora_fin'] ?? '').trim();
                        return hIni && hFin ? `${hIni} - ${hFin}` : '';
                    })
                    .filter(Boolean)
                    .join(', ');

                const expAnios = obj['experienciaAnios'] ?? obj['experiencia_anios'];
                const experienciaTexto =
                    String(obj['experiencia'] ?? '').trim() ||
                    (expAnios !== undefined && expAnios !== null && String(expAnios).trim() !== ''
                        ? `${expAnios} año(s) de experiencia`
                        : 'Experiencia registrada');

                const idFinal = Number(
                    obj['id'] ?? obj['idUsuario'] ?? obj['id_usuario'] ?? usuario['idUsuario'] ?? 0
                ) || 0;

                const nombreFinal =
                    String(obj['nombre'] ?? usuario['nombre'] ?? '').trim() ||
                    `Técnico #${idFinal || ''}`.trim();

                const categoriaFinal =
                    String(obj['categoria'] ?? '').trim() ||
                    nombresCats.join(', ') ||
                    'Especialista';

                const zonaFinal =
                    String(obj['zona'] ?? '').trim() ||
                    nombresZonas.join(', ') ||
                    'Zona por confirmar';

                const disponibilidadFinal =
                    String(obj['disponibilidad'] ?? '').trim() ||
                    textoDisp ||
                    'Horario por confirmar';

                return {
                    id: idFinal,
                    nombre: nombreFinal,
                    categoria: categoriaFinal,
                    zona: zonaFinal,
                    disponibilidad: disponibilidadFinal,
                    experiencia: experienciaTexto,
                    _categoriaIds: idsCats,
                } as Trabajador & { _categoriaIds?: number[] };
            });

            const filtroCatNum = Number(filtros.categoria ?? 0) || 0;
            const filtroZonaTxt = String(filtros.zona ?? '').trim().toLowerCase();

            return normalizados
                .filter((t) => {
                    const matchCat =
                        !filtroCatNum ||
                        t._categoriaIds?.includes(filtroCatNum);
                    const matchZona =
                        !filtroZonaTxt ||
                        t.zona.toLowerCase().includes(filtroZonaTxt);
                    return matchCat && matchZona;
                })
                .map(({ _categoriaIds: _ignored, ...rest }) => rest);
        });
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

    async misSolicitudes(): Promise<Solicitud[]> {
        const idCliente = injectarUsuarioDesdeStorage();

        if (!idCliente) {
            throw new Error('Debes iniciar sesión.');
        }

        const lista = await firstValueFrom(
            this.http.get<Array<{
                id: number;
                titulo: string;
                direccion: string;
                fecha_preferida: string | null;
                fecha_creacion: string;
                estado_publicacion: string;
            }>>(
                `${API_URL}/trabajo/cliente/${idCliente}/dashboard`
            )
        );

        return lista.map(t => ({
            id: t.id,
            titulo: t.titulo,
            descripcion: '',
            direccion: t.direccion,
            zona: t.direccion,
            disponibilidad: t.fecha_preferida
                ? new Date(t.fecha_preferida).toLocaleString('es-BO')
                : 'Por coordinar',
            estado: t.estado_publicacion === 'abierto'
                ? 'ACTIVA'
                : t.estado_publicacion.toUpperCase(),
            creadaEn: t.fecha_creacion,
            categoria: 'Sin categoría informada'
        }));
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

    async miPerfilTecnico(idUsuario: number): Promise<PerfilTrabajador> {
        const raw = await firstValueFrom(this.http.get<unknown>(
            `${API_URL}/perfil-trabajador/${idUsuario}`
        ));
        const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const categorias = Array.isArray(p['categoriaReparadors'])
            ? p['categoriaReparadors'] as Array<Record<string, unknown>> : [];
        const cr = categorias[0] ?? {};
        const cat = (cr['categoria'] && typeof cr['categoria'] === 'object'
            ? cr['categoria'] : {}) as Record<string, unknown>;
        const zonas = Array.isArray(p['zonaReparadors'])
            ? p['zonaReparadors'] as Array<Record<string, unknown>> : [];
        const disp = Array.isArray(p['disponibilidads'])
            ? p['disponibilidads'] as Array<Record<string, unknown>> : [];
        const horario = disp[0] ?? {};
        const anios = Number(p['experienciaAnios'] ?? 0);
        return {
            id: Number(p['idUsuario'] ?? idUsuario),
            aprobado: String(p['estadoAprobacion'] ?? '') === 'aprobado',
            experiencia: String(p['experiencia'] ?? `${anios} año(s) de experiencia`),
            zona: String(p['zona'] ?? zonas[0]?.['etiqueta'] ?? ''),
            disponibilidad: String(p['disponibilidad'] ??
                (horario['horaInicio'] && horario['horaFin']
                    ? `${horario['horaInicio']} - ${horario['horaFin']}` : '')),
            categoria: cat['nombre'] ? {
                id: Number(cat['idCategoria'] ?? cr['idCategoria'] ?? 0),
                nombre: String(cat['nombre'])
            } : null,
        };
    }


    // --------------------------------------
    // 6.3 GUARDAR PERFIL TECNICO
    // --------------------------------------

    async guardarPerfil(datos: unknown): Promise<PerfilTrabajador> {
        const usuario = injectarUsuarioDesdeStorage();
        if (!usuario) throw new Error('Debes iniciar sesion.');
        await firstValueFrom(this.http.patch(
            `${API_URL}/trabajadores/mi-perfil`, datos
        ));
        return this.miPerfilTecnico(usuario);
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









