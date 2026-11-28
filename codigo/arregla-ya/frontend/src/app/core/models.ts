
export type Rol = 'CLIENTE' | 'EMPRESA' | 'TRABAJADOR' | 'ADMIN';

// Datos de un usuario
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
}

// Categorías de servicios
export interface Categoria {
    id: number;
    nombre: string;
}

// Datos de un trabajador
export interface Trabajador {
    id: number;
    nombre: string;
    categoria: string;
    zona: string;
    disponibilidad: string;
    experiencia: string;
}

// Datos de una solicitud
export interface Solicitud {
    id: number;
    titulo: string;
    descripcion: string;
    direccion?: string;
    zona: string;
    disponibilidad: string;
    fotoUrl?: string | null;
    estado: string;
    creadaEn: string;
    categoria: Categoria | string;
}

// Datos de una propuesta
export interface Propuesta {
    id: number;
    trabajador?: {
        id: number;
        nombre: string;
    };
    solicitud?: string;
    precio: string;
    costoVisita?: string;
    materialesIncluidos?: boolean;
    detalleMateriales?: string;
    estado: string;
}

/** Ajuste histórico de precio asociado a un servicio. */
export interface AjustePresupuesto {
    id_incremento: number;
    id_solicitante: number | null;
    nombre_solicitante: string;
    monto_anterior: string;
    monto_nuevo: string;
    motivo: string;
    estado_aprobacion: string;
    fecha_solicitud: string;
    fecha_respuesta: string | null;
}

/** Servicio activo o histórico visible para una de sus partes. */
export interface ServicioPresupuesto {
    id_servicio: number;
    estado: string;
    id_trabajo: number;
    titulo_trabajo: string;
    id_reparador: number;
    id_propuesta: number;
    precio_total: string;
    incrementos: AjustePresupuesto[];
}

/** Solicitud pendiente que espera la decisión de administración. */
export interface IncrementoPendienteAdmin {
    idIncremento: number;
    montoAnterior: string;
    montoNuevo: string;
    motivo: string;
    fechaSolicitud: string;
    usuario?: { idUsuario: number; nombre: string; email: string } | null;
    servicio?: {
        idServicio: number;
        propuesta?: { trabajo?: { idTrabajo: number; titulo: string } | null } | null;
    } | null;
}

// Perfil profesional de un trabajador
export interface PerfilTrabajador {
    id: number;
    aprobado: boolean;
    experiencia: string;
    zona: string;
    disponibilidad: string;
    categoria?: Categoria | null;
}
