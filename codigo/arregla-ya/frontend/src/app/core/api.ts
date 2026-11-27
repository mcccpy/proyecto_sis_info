
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

        let usuarioActual: Usuario | null = this.usuario();
        if (!usuarioActual) {
            try {
                const rawUsuario = localStorage.getItem('ay_usuario');
                if (rawUsuario) {
                    usuarioActual = JSON.parse(rawUsuario) as Usuario;
                }
            } catch {
                usuarioActual = null;
            }
        }

        if (!usuarioActual) {
            return;
        }

        this.usuario.set(usuarioActual);

        const idUsuario = Number(
            (usuarioActual as unknown as Record<string, unknown>)?.['id'] ??
            (usuarioActual as unknown as Record<string, unknown>)?.['idUsuario'] ??
            (usuarioActual as unknown as Record<string, unknown>)?.['id_usuario'] ??
            0
        );

        if (idUsuario > 0) {
            try {
                const refrescado = await firstValueFrom(
                    this.http.get<Record<string, unknown>>(`${API_URL}/usuario/${idUsuario}`)
                );
                if (refrescado && typeof refrescado === 'object') {
                    const combinado = {
                        ...(usuarioActual as unknown as Record<string, unknown>),
                        ...refrescado,
                        id: Number(refrescado['id'] ?? refrescado['idUsuario'] ?? idUsuario),
                    } as unknown as Usuario;
                    this.usuario.set(combinado);
                    localStorage.setItem('ay_usuario', JSON.stringify(combinado));
                }
            } catch {
                // Mantener usuario guardado en sesion si no se puede refrescar
            }
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
                        !t._categoriaIds?.length ||
                        t._categoriaIds.includes(filtroCatNum);
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
        const d = datos && typeof datos === 'object' ? (datos as Record<string, unknown>) : {};
        const u = (this as unknown as { auth?: { usuario?: () => Record<string, unknown> | null } }).auth?.usuario?.();

        let idCliente = Number(
            d['id_cliente'] ??
            d['idCliente'] ??
            u?.['id'] ??
            u?.['idUsuario'] ??
            u?.['id_usuario'] ??
            0
        );

        if (!(idCliente > 0)) {
            try {
                const raw = localStorage.getItem('ay_usuario');
                if (raw) {
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    idCliente = Number(
                        parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0
                    );
                }
            } catch {
                // Ignorar errores de lectura de localStorage
            }
        }

        if (!(idCliente > 0)) {
            throw new Error('No se pudo identificar el ID del cliente actual.');
        }

        const catId = Number(d['categoriaId'] ?? d['id_categoria'] ?? 0);
        const categorias = Array.isArray(d['categorias'])
            ? (d['categorias'] as unknown[]).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
            : catId > 0
                ? [catId]
                : [];

        const dispStr = String(d['disponibilidad'] ?? d['fecha_preferida'] ?? '').trim();
        const fechaParsed = dispStr ? new Date(dispStr) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const fechaPreferida = Number.isNaN(fechaParsed.getTime())
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : fechaParsed.toISOString();

        const zonaStr = String(d['zona'] ?? '').trim();
        const dirBase = String(d['direccion'] ?? '').trim();
        const direccion = zonaStr && !dirBase.toLowerCase().includes(zonaStr.toLowerCase())
            ? `${dirBase} (${zonaStr})`
            : dirBase;

        const latitud = Number(d['latitud'] ?? -17.3895);
        const longitud = Number(d['longitud'] ?? -66.1568);

        const payload: Record<string, unknown> = {
            id_cliente: idCliente,
            direccion,
            latitud: Number.isFinite(latitud) ? latitud : -17.3895,
            longitud: Number.isFinite(longitud) ? longitud : -66.1568,
            titulo: String(d['titulo'] ?? '').trim(),
            descripcion: String(d['descripcion'] ?? '').trim(),
            fecha_preferida: fechaPreferida,
            categorias,
        };

        const fotoUrl = String(d['fotoUrl'] ?? '').trim();
        if (fotoUrl) {
            payload['documentos'] = [
                {
                    tipo_documento: 'FOTO',
                    ubucacion_archivo: fotoUrl,
                    url_y_n: true,
                },
            ];
        }

        return firstValueFrom(
            this.http.post<Record<string, unknown>>(
                `${API_URL}/trabajo/abierto`,
                payload
            )
        ).then((res) => {
            const id = Number(
                res?.['id'] ??
                res?.['idTrabajo'] ??
                res?.['id_trabajo'] ??
                0
            );
            const estado = String(
                res?.['estado'] ??
                res?.['estadoTrabajo'] ??
                res?.['estado_trabajo'] ??
                'PUBLICADA'
            );
            return { id, estado };
        });
    }


    // --------------------------------------
    // 5.4 VER MIS SOLICITUDES
    // --------------------------------------

    misSolicitudes() {
        const u = (this as unknown as { auth?: { usuario?: () => Record<string, unknown> | null } }).auth?.usuario?.();
        let idCliente = Number(u?.['id'] ?? u?.['idUsuario'] ?? u?.['id_usuario'] ?? 0);

        if (!(idCliente > 0)) {
            try {
                const raw = localStorage.getItem('ay_usuario');
                if (raw) {
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    idCliente = Number(
                        parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0
                    );
                }
            } catch {
                // Ignorar errores de lectura de localStorage
            }
        }

        if (!(idCliente > 0)) {
            throw new Error('No se pudo identificar el ID del cliente actual.');
        }

        return firstValueFrom(
            this.http.get<unknown>(`${API_URL}/trabajo/cliente/${idCliente}/dashboard`)
        ).then((raw) => {
            const lista = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as Record<string, unknown>)?.['data'])
                    ? ((raw as Record<string, unknown>)['data'] as unknown[])
                    : Array.isArray((raw as Record<string, unknown>)?.['items'])
                        ? ((raw as Record<string, unknown>)['items'] as unknown[])
                        : [];

            return lista
                .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
                .map((item) => {
                    const id = Number(item['id'] ?? item['idTrabajo'] ?? item['id_trabajo'] ?? 0);
                    const titulo = String(item['titulo'] ?? 'Sin título');
                    const direccion = String(item['direccion'] ?? '');
                    const estadoPub = String(item['estado_publicacion'] ?? item['estadoPublicacion'] ?? '');
                    const estadoServ = String(item['estado_servicio'] ?? item['estadoServicio'] ?? '');
                    const estado = String(
                        item['estado'] ?? (estadoServ || estadoPub || 'ABIERTA')
                    );
                    const disponibilidad = String(
                        item['fecha_preferida'] ?? item['fechaPreferida'] ?? item['disponibilidad'] ?? ''
                    );
                    const fechaCreacion = String(
                        item['fecha_creacion'] ?? item['fechaCreacion'] ?? ''
                    );
                    const totalOfertas = Number(
                        item['total_ofertas'] ?? item['totalOfertas'] ?? 0
                    );

                    return {
                        id,
                        titulo,
                        descripcion: String(item['descripcion'] ?? ''),
                        direccion,
                        zona: String(item['zona'] ?? ''),
                        disponibilidad,
                        estado,
                        fechaCreacion,
                        totalOfertas,
                    } as unknown as Solicitud;
                });
        });
    }


    // --------------------------------------
    // 5.5 VER SOLICITUDES DISPONIBLES
    // --------------------------------------

    async disponibles(): Promise<Solicitud[]> {
        let idReparador = 0;
        try {
            const rawStorage = localStorage.getItem('ay_usuario');
            if (rawStorage) {
                const parsed = JSON.parse(rawStorage) as Record<string, unknown>;
                idReparador = Number(parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0);
            }
        } catch {
            // Ignorar error de lectura
        }

        const rutasCandidatas: string[] = [];
        if (idReparador > 0) {
            rutasCandidatas.push(`${API_URL}/trabajo/portal-reparador/${idReparador}/explorar`);
        }
        rutasCandidatas.push(`${API_URL}/trabajo`);

        let listaRaw: unknown[] = [];
        let ultimoError: unknown = null;

        for (const url of rutasCandidatas) {
            try {
                const resp = await firstValueFrom(this.http.get<unknown>(url));
                if (Array.isArray(resp)) {
                    listaRaw = resp;
                    ultimoError = null;
                    break;
                }
                if (resp && typeof resp === 'object') {
                    const obj = resp as Record<string, unknown>;
                    const posibleLista = obj['items'] ?? obj['trabajos'] ?? obj['solicitudes'] ?? obj['data'];
                    if (Array.isArray(posibleLista)) {
                        listaRaw = posibleLista;
                        ultimoError = null;
                        break;
                    }
                }
            } catch (err) {
                ultimoError = err;
            }
        }

        if (ultimoError && listaRaw.length === 0) {
            throw ultimoError;
        }

        return listaRaw
            .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
            .map((item, idx) => {
                const catObj = item['categoria'] && typeof item['categoria'] === 'object'
                    ? (item['categoria'] as Record<string, unknown>)
                    : undefined;
                const nombreCat = String(
                    catObj?.['nombre'] ??
                    item['categoriaNombre'] ??
                    (typeof item['categoria'] === 'string' ? item['categoria'] : '') ??
                    ''
                ).trim();

                return {
                    ...(item as unknown as Solicitud),
                    id: Number(item['id'] ?? item['idTrabajo'] ?? item['id_trabajo'] ?? item['idSolicitud'] ?? idx + 1),
                    titulo: String(item['titulo'] ?? item['nombre'] ?? `Trabajo #${idx + 1}`).trim(),
                    descripcion: String(item['descripcion'] ?? item['detalle'] ?? '').trim(),
                    categoria: nombreCat || 'General',
                    zona: String(item['zona'] ?? item['zonaCobertura'] ?? item['ubicacion'] ?? 'Por coordinar').trim(),
                    disponibilidad: String(item['disponibilidad'] ?? item['horario'] ?? 'A convenir').trim(),
                    estado: String(item['estado'] ?? item['estadoTrabajo'] ?? 'ABIERTA').trim(),
                };
            });
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

    async misOfertas(): Promise<Propuesta[]> {
        let idUsuario = 0;
        try {
            const u = (this as unknown as { auth?: { usuario?: () => Record<string, unknown> | null } }).auth?.usuario?.();
            idUsuario = Number(u?.['id'] ?? u?.['idUsuario'] ?? u?.['id_usuario'] ?? 0);
            if (!(idUsuario > 0)) {
                const rawStorage = localStorage.getItem('ay_usuario');
                if (rawStorage) {
                    const parsed = JSON.parse(rawStorage) as Record<string, unknown>;
                    idUsuario = Number(parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0);
                }
            }
        } catch {
            // Ignorar error de lectura
        }

        const rutas: string[] = [];
        if (idUsuario > 0) {
            rutas.push(`${API_URL}/trabajo/portal-reparador/${idUsuario}/postulaciones`);
        }
        rutas.push(`${API_URL}/propuestas/mias`);

        for (const url of rutas) {
            try {
                const resp = await firstValueFrom(this.http.get<unknown>(url));
                const lista = Array.isArray(resp)
                    ? resp
                    : resp && typeof resp === 'object'
                        ? ((resp as Record<string, unknown>)['items'] ??
                            (resp as Record<string, unknown>)['postulaciones'] ??
                            (resp as Record<string, unknown>)['propuestas'] ??
                            (resp as Record<string, unknown>)['data'] ??
                            [])
                        : [];

                if (Array.isArray(lista)) {
                    return lista
                        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
                        .map((item, idx) => {
                            const trabajoObj = item['trabajo'] && typeof item['trabajo'] === 'object'
                                ? (item['trabajo'] as Record<string, unknown>)
                                : undefined;
                            return {
                                id: Number(item['id'] ?? item['idPropuesta'] ?? item['id_propuesta'] ?? idx + 1),
                                solicitud: String(
                                    item['solicitud'] ??
                                    item['tituloTrabajo'] ??
                                    item['titulo_trabajo'] ??
                                    trabajoObj?.['titulo'] ??
                                    'Solicitud'
                                ),
                                precio: Number(item['precio'] ?? item['monto'] ?? item['montoCotizado'] ?? 0),
                                costoVisita: item['costoVisita'] !== undefined
                                    ? Number(item['costoVisita'])
                                    : item['costo_visita'] !== undefined
                                        ? Number(item['costo_visita'])
                                        : undefined,
                                detalleMateriales: String(
                                    item['detalleMateriales'] ?? item['detalle_materiales'] ?? item['observaciones'] ?? ''
                                ),
                                estado: String(item['estado'] ?? 'enviada'),
                            } as unknown as Propuesta;
                        });
                }
            } catch (err) {
                const status =
                    typeof err === 'object' && err !== null && 'status' in err
                        ? Number((err as { status?: unknown }).status)
                        : 0;
                if (status === 404) {
                    continue;
                }
                throw err;
            }
        }

        return [];
    }

    // --------------------------------------
    // 6.2 VER MI PERFIL TECNICO
    // --------------------------------------

    async miPerfilTecnico(idUsuario: number): Promise<PerfilTrabajador> {
        const raw = await firstValueFrom(
            this.http.get<Record<string, unknown>>(
                `${API_URL}/perfil-trabajador/${idUsuario}`
            )
        );

        const estadoRaw = String(
            raw?.['estadoAprobacion'] ??
            raw?.['estado_aprobacion'] ??
            raw?.['estado'] ??
            ''
        ).trim().toLowerCase();

        const aprobado =
            raw?.['aprobado'] === true ||
            estadoRaw === 'aprobado' ||
            estadoRaw === 'approved' ||
            estadoRaw === 'activo';

        const catReparadors = Array.isArray(raw?.['categoriaReparadors'])
            ? (raw['categoriaReparadors'] as Record<string, unknown>[])
            : [];
        const primeraCatObj =
            catReparadors[0] && typeof catReparadors[0] === 'object'
                ? ((catReparadors[0]['categoria'] as Record<string, unknown> | undefined) ?? catReparadors[0])
                : undefined;
        const catDirecta =
            raw?.['categoria'] && typeof raw['categoria'] === 'object'
                ? (raw['categoria'] as Record<string, unknown>)
                : undefined;

        const catFuente = primeraCatObj ?? catDirecta;
        const categoriaId = Number(
            catFuente?.['idCategoria'] ??
            catFuente?.['id_categoria'] ??
            catFuente?.['id'] ??
            raw?.['categoriaId'] ??
            raw?.['idCategoria'] ??
            0
        );
        const categoriaNombre = String(
            catFuente?.['nombre'] ??
            catFuente?.['titulo'] ??
            raw?.['categoriaNombre'] ??
            ''
        ).trim();

        const zonasRaw = Array.isArray(raw?.['zonaReparadors'])
            ? (raw['zonaReparadors'] as Record<string, unknown>[])
            : [];
        const zonaTexto = String(
            raw?.['zona'] ??
            zonasRaw[0]?.['etiqueta'] ??
            ''
        ).trim();

        const dispRaw = Array.isArray(raw?.['disponibilidads'])
            ? (raw['disponibilidads'] as Record<string, unknown>[])
            : [];
        const dispTexto = String(
            raw?.['disponibilidad'] ??
            (dispRaw[0]
                ? `${dispRaw[0]['diaSemana'] ?? ''} ${dispRaw[0]['horaInicio'] ?? ''}-${dispRaw[0]['horaFin'] ?? ''}`.trim()
                : '')
        ).trim();

        const experienciaTexto = String(
            raw?.['experiencia'] ??
            (raw?.['experienciaAnios'] !== undefined ? `${raw['experienciaAnios']} año(s) de experiencia` : '')
        ).trim();

        return {
            ...(raw as unknown as PerfilTrabajador),
            aprobado,
            experiencia: experienciaTexto,
            zona: zonaTexto,
            disponibilidad: dispTexto,
            categoria: categoriaNombre || categoriaId > 0
                ? {
                    id: categoriaId,
                    nombre: categoriaNombre || `Categoría #${categoriaId}`,
                }
                : undefined,
        };
    }
    // --------------------------------------
    // 6.3 GUARDAR PERFIL TECNICO
    // --------------------------------------

    guardarPerfil(datos: unknown) {
        const d = datos && typeof datos === 'object' ? (datos as Record<string, unknown>) : {};
        const u = (this as unknown as { auth?: { usuario?: () => Record<string, unknown> | null } }).auth?.usuario?.();

        let idUsuario = Number(
            d['idUsuario'] ??
            d['id_usuario'] ??
            u?.['id'] ??
            u?.['idUsuario'] ??
            u?.['id_usuario'] ??
            0
        );

        if (!(idUsuario > 0)) {
            try {
                const raw = localStorage.getItem('ay_usuario');
                if (raw) {
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    idUsuario = Number(
                        parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0
                    );
                }
            } catch {
                // Ignorar errores de lectura de localStorage
            }
        }

        const payload: Record<string, unknown> = {
            ...d,
            ...(idUsuario > 0 ? { idUsuario } : {}),
        };

        const headers: Record<string, string> = idUsuario > 0
            ? { 'x-user-id': String(idUsuario) }
            : {};

        return firstValueFrom(
            this.http.patch(
                `${API_URL}/trabajadores/mi-perfil`,
                payload,
                { headers }
            )
        );
    }


    // ======================================
    // FUNCIONES DEL ADMINISTRADOR
    // ======================================


  // --------------------------------------
    // 7.1 VER TRABAJADORES PENDIENTES
    // --------------------------------------

    pendientes(estadoFiltro: string = 'pendiente') {
        const idAdmin = this.obtenerIdAdminActual();
        const normalizado = estadoFiltro.trim().toLowerCase();
        const params: Record<string, string> = {
            id_admin: String(idAdmin),
        };
        if (normalizado && normalizado !== 'todos') {
            params['estado_aprobacion'] = normalizado;
        }

        return firstValueFrom(
            this.http.get<unknown>(`${API_URL}/usuario/admin/reparadores`, {
                params,
            })
        ).then((raw) => {
            const lista = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as Record<string, unknown>)?.['data'])
                    ? ((raw as Record<string, unknown>)['data'] as unknown[])
                    : Array.isArray((raw as Record<string, unknown>)?.['items'])
                        ? ((raw as Record<string, unknown>)['items'] as unknown[])
                        : [];

            return lista
                .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
                .filter((item) => {
                    if (!normalizado || normalizado === 'todos') return true;
                    const estado = String(
                        item['estadoAprobacion'] ?? item['estado_aprobacion'] ?? 'pendiente'
                    ).toLowerCase();
                    return estado === normalizado;
                })
                .map((item) => {
                    const usuarioObj =
                        item['usuario'] && typeof item['usuario'] === 'object'
                            ? (item['usuario'] as Record<string, unknown>)
                            : undefined;

                    const id = Number(
                        item['idPerfilTrabajador'] ??
                        item['id_perfil_trabajador'] ??
                        item['id'] ??
                        item['idUsuario'] ??
                        item['id_usuario'] ??
                        0
                    );

                    const nombre = String(
                        usuarioObj?.['nombre'] ?? item['nombre'] ?? 'Sin nombre'
                    );

                    const email = String(
                        usuarioObj?.['email'] ?? item['email'] ?? ''
                    );

                    const zonasRaw = item['zonaReparadors'] ?? item['zonas'] ?? item['zona'];
                    const zona = Array.isArray(zonasRaw)
                        ? zonasRaw
                            .map((z) => {
                                if (typeof z === 'string') return z;
                                const zObj = z && typeof z === 'object' ? (z as Record<string, unknown>) : undefined;
                                const zonaNested =
                                    zObj?.['zona'] && typeof zObj['zona'] === 'object'
                                        ? (zObj['zona'] as Record<string, unknown>)
                                        : undefined;
                                return String(zonaNested?.['nombre'] ?? zObj?.['nombre'] ?? '');
                            })
                            .filter(Boolean)
                            .join(', ') || 'Sin zona'
                        : String(zonasRaw ?? 'Sin zona');

                    const experienciaRaw =
                        item['experiencia'] ??
                        (item['experienciaAnios'] !== undefined
                            ? `${item['experienciaAnios']} año(s) de experiencia`
                            : item['experiencia_anios'] !== undefined
                                ? `${item['experiencia_anios']} año(s) de experiencia`
                                : '');
                    const experiencia = String(experienciaRaw || 'Sin experiencia registrada');

                    const catsRaw =
                        item['categoriaReparadors'] ?? item['categorias'] ?? item['categoria'];
                    const categoria = Array.isArray(catsRaw)
                        ? catsRaw
                            .map((c) => {
                                if (typeof c === 'string') return c;
                                const cObj = c && typeof c === 'object' ? (c as Record<string, unknown>) : undefined;
                                const catNested =
                                    cObj?.['categoria'] && typeof cObj['categoria'] === 'object'
                                        ? (cObj['categoria'] as Record<string, unknown>)
                                        : undefined;
                                return String(catNested?.['nombre'] ?? cObj?.['nombre'] ?? '');
                            })
                            .filter(Boolean)
                            .join(', ') || 'General'
                        : String(catsRaw ?? 'General');

                    return {
                        id,
                        nombre,
                        email,
                        zona,
                        experiencia,
                        categoria,
                    };
                });
        });
    }

    // --------------------------------------
    // 7.2 APROBAR TRABAJADOR
    // --------------------------------------

    aprobar(id: number) {
        const idAdmin = this.obtenerIdAdminActual();

        return firstValueFrom(
            this.http.patch(
                `${API_URL}/usuario/admin/reparadores/${id}/estado`,
                {
                    id_admin: idAdmin,
                    estado_aprobacion: 'aprobado',
                }
            )
        );
    }

    rechazar(id: number) {
        const idAdmin = this.obtenerIdAdminActual();

        return firstValueFrom(
            this.http.patch(
                `${API_URL}/usuario/admin/reparadores/${id}/estado`,
                {
                    id_admin: idAdmin,
                    estado_aprobacion: 'rechazado',
                }
            )
        );
    }

    private obtenerIdAdminActual(): number {
        const u = (this as unknown as { auth?: { usuario?: () => Record<string, unknown> | null } }).auth?.usuario?.();
        const desdeSignal = Number(u?.['id'] ?? u?.['idUsuario'] ?? u?.['id_usuario'] ?? 0);
        if (desdeSignal > 0) return desdeSignal;

        try {
            const raw = localStorage.getItem('ay_usuario');
            if (raw) {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                const desdeStorage = Number(
                    parsed?.['id'] ?? parsed?.['idUsuario'] ?? parsed?.['id_usuario'] ?? 0
                );
                if (desdeStorage > 0) return desdeStorage;
            }
        } catch {
            // Ignorar errores de lectura de localStorage
        }

        throw new Error('No se pudo identificar el ID del administrador actual.');
    }

    obtenerDevolucionesPago(idPago: number): Promise<{
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
    }> {
        return firstValueFrom(
            this.http.get<{
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
            }>(`${API_URL}/pago/${idPago}/devoluciones`)
        );
    }

    registrarDevolucionParcial(
        idPago: number,
        payload: { monto: number; motivo: string }
    ): Promise<{
        devolucion: {
            idDevolucion: number;
            idPago: number;
            monto: number;
            motivo: string;
            creadoEn: string;
        };
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
    }> {
        return firstValueFrom(
            this.http.post<{
                devolucion: {
                    idDevolucion: number;
                    idPago: number;
                    monto: number;
                    motivo: string;
                    creadoEn: string;
                };
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
            }>(`${API_URL}/pago/${idPago}/devoluciones`, payload)
        );
    }
}


